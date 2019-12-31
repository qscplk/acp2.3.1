// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package statefulset

import (
	"log"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/ingress"
	"alauda.io/diablo/src/backend/resource/network"
	"alauda.io/diablo/src/backend/resource/service"
	apps "k8s.io/api/apps/v1"
	"k8s.io/client-go/kubernetes"
)

// StatefulSetList contains a list of Stateful Sets in the cluster.
type StatefulSetList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Basic information about resources status on the list.
	Status common.ResourceStatus `json:"status"`

	// Unordered list of Pet Sets.
	StatefulSets      []StatefulSet      `json:"statefulSets"`
	CumulativeMetrics []metricapi.Metric `json:"cumulativeMetrics"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *StatefulSetList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.StatefulSets))
		for i, d := range list.StatefulSets {
			res[i] = d
		}
	}
	return
}

// StatefulSet is a presentation layer view of Kubernetes Stateful Set resource. This means it is
// Stateful Set plus additional augmented data we can get from other sources (like services that
// target the same pods).
type StatefulSet struct {
	ObjectMeta api.ObjectMeta           `json:"objectMeta"`
	TypeMeta   api.TypeMeta             `json:"typeMeta"`
	PodInfo    common.PodControllerInfo `json:"podInfo"`
	Status     common.ControllerStatus  `json:"status"`
	// Container images of the Daemon Set.
	ContainerImages []string `json:"containerImages"`
	// InitContainer images of the Daemon Set.
	InitContainerImages []string             `json:"initContainerImages"`
	VisitAddresses      network.VisitAddress `json:"visitAddresses"`
}

type StatefulSetSlice []StatefulSet

func (s StatefulSetSlice) Len() int           { return len(s) }
func (s StatefulSetSlice) Swap(i, j int)      { s[i], s[j] = s[j], s[i] }
func (s StatefulSetSlice) Less(i, j int) bool { return s[i].ObjectMeta.Name < s[j].ObjectMeta.Name }

func (ing StatefulSet) GetObjectMeta() api.ObjectMeta {
	return ing.ObjectMeta
}

// GetStatefulSetList returns a list of all Stateful Sets in the cluster.
func GetStatefulSetList(client kubernetes.Interface, nsQuery *common.NamespaceQuery,
	dsQuery *dataselect.DataSelectQuery, metricClient metricapi.MetricClient) (*StatefulSetList, error) {
	log.Print("Getting list of all pet sets in the cluster")

	channels := &common.ResourceChannels{
		StatefulSetList: common.GetStatefulSetListChannel(client, nsQuery, 1),
		PodList:         common.GetPodListChannel(client, nsQuery, 1),
		EventList:       common.GetEventListChannel(client, nsQuery, 1),
		// List and error channels to Services.
		ServiceList: common.GetServiceListChannel(client, nsQuery, 1),
		// List and error channels to Ingresses.
		IngressList: common.GetIngressListChannel(client, nsQuery, 1),
	}

	return GetStatefulSetListFromChannels(channels, dsQuery, metricClient)
}

// GetStatefulSetListFromChannels returns a list of all Stateful Sets in the cluster reading
// required resource list once from the channels.
func GetStatefulSetListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery,
	metricClient metricapi.MetricClient) (*StatefulSetList, error) {

	statefulSets := <-channels.StatefulSetList.List
	err := <-channels.StatefulSetList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	pods := <-channels.PodList.List
	err = <-channels.PodList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}

	events := <-channels.EventList.List
	err = <-channels.EventList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}

	ss := <-channels.ServiceList.List
	err = <-channels.ServiceList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}

	is := <-channels.IngressList.List
	err = <-channels.IngressList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}
	rc := &common.ResourceCollection{
		StatefulSets: statefulSets.Items,
		Pods:         pods.Items,
		Events:       events.Items,
		Services:     ss.Items,
		Ingresses:    is.Items,
	}
	ssList := toStatefulSetList(rc, nonCriticalErrors, dsQuery, metricClient)
	return ssList, nil
}

func toStatefulSetList(rc *common.ResourceCollection, nonCriticalErrors []error,
	dsQuery *dataselect.DataSelectQuery, metricClient metricapi.MetricClient) *StatefulSetList {

	statefulSetList := &StatefulSetList{
		StatefulSets: make([]StatefulSet, 0),
		ListMeta:     api.ListMeta{TotalItems: len(rc.StatefulSets)},
		Errors:       nonCriticalErrors,
	}

	if len(rc.StatefulSets) == 0 {
		return statefulSetList
	}

	cachedResources := &metricapi.CachedResources{
		Pods: rc.Pods,
	}
	ssCells, metricPromises, filteredTotal := dataselect.GenericDataSelectWithFilterAndMetrics(
		toCells(rc.StatefulSets), dsQuery, cachedResources, metricClient)
	statefulSets := fromCells(ssCells)
	statefulSetList.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for _, statefulSet := range statefulSets {
		matchingPods := common.FilterPodsByControllerRef(&statefulSet, rc.Pods)
		podInfo := common.GetPodControllerInfo(statefulSet.Status.Replicas, statefulSet.Spec.Replicas, statefulSet.GetObjectMeta(), matchingPods, rc.Events)
		_, visitAddresses := network.GetNetworkInfo(statefulSet.Spec.Template.Spec.Containers, rc.Ingresses, rc.Services, statefulSet.Namespace, statefulSet.Spec.Template.Labels)
		statefulSetList.StatefulSets = append(statefulSetList.StatefulSets, toStatefulSet(&statefulSet, podInfo, visitAddresses))
	}

	cumulativeMetrics, err := metricPromises.GetMetrics()
	statefulSetList.CumulativeMetrics = cumulativeMetrics
	if err != nil {
		statefulSetList.CumulativeMetrics = make([]metricapi.Metric, 0)
	}

	return statefulSetList
}

func toStatefulSet(statefulSet *apps.StatefulSet, podInfo common.PodControllerInfo, visitAddresses network.VisitAddress) StatefulSet {
	return StatefulSet{
		ObjectMeta:          api.NewObjectMeta(statefulSet.ObjectMeta),
		TypeMeta:            api.NewTypeMeta(api.ResourceKindStatefulSet),
		ContainerImages:     common.GetContainerImages(&statefulSet.Spec.Template.Spec),
		InitContainerImages: common.GetInitContainerImages(&statefulSet.Spec.Template.Spec),
		PodInfo:             podInfo,
		VisitAddresses:      visitAddresses,
		Status:              common.GetControllerStatus(&podInfo),
	}
}

func ToStatefulSetList(res []common.Resource) (list []StatefulSet) {
	var (
		ok bool
		cm StatefulSet
	)
	list = make([]StatefulSet, 0, len(res))
	for _, r := range res {
		if cm, ok = r.(StatefulSet); ok {
			list = append(list, cm)
		}
	}
	return
}

func GenerateFromCore(app appCore.Application, rc *common.ResourceCollection, metricClient metricapi.MetricClient) (*StatefulSetList, error) {
	statefulSets, err := GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.StatefulSets = statefulSets
	ingresses, err := ingress.GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.Ingresses = ingresses
	services, err := service.GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.Services = services
	nonCriticalErrors := make([]error, 0)
	return toStatefulSetList(rc, nonCriticalErrors, dataselect.NoDataSelect, metricClient), nil
}
