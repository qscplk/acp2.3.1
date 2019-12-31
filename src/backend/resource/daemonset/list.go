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

package daemonset

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
	"k8s.io/client-go/kubernetes"
)

// DaemonSetList contains a list of Daemon Sets in the cluster.
type DaemonSetList struct {
	ListMeta          api.ListMeta       `json:"listMeta"`
	DaemonSets        []DaemonSet        `json:"daemonSets"`
	CumulativeMetrics []metricapi.Metric `json:"cumulativeMetrics"`

	// Basic information about resources status on the list.
	Status common.ResourceStatus `json:"status"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *DaemonSetList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.DaemonSets))
		for i, d := range list.DaemonSets {
			res[i] = d
		}
	}
	return
}

// DaemonSet plus zero or more Kubernetes services that target the Daemon Set.
type DaemonSet struct {
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

type DaemonSetSlice []DaemonSet

func (s DaemonSetSlice) Len() int           { return len(s) }
func (s DaemonSetSlice) Swap(i, j int)      { s[i], s[j] = s[j], s[i] }
func (s DaemonSetSlice) Less(i, j int) bool { return s[i].ObjectMeta.Name < s[j].ObjectMeta.Name }

func (ing DaemonSet) GetObjectMeta() api.ObjectMeta {
	return ing.ObjectMeta
}

// GetDaemonSetList returns a list of all Daemon Set in the cluster.
func GetDaemonSetList(client kubernetes.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery,
	metricClient metricapi.MetricClient) (*DaemonSetList, error) {
	log.Print("Getting list of all daemonSets in the cluster")
	channels := &common.ResourceChannels{
		DaemonSetList: common.GetDaemonSetListChannel(client, nsQuery, 1),
		PodList:       common.GetPodListChannel(client, nsQuery, 1),
		EventList:     common.GetEventListChannel(client, nsQuery, 1),
		// List and error channels to Services.
		ServiceList: common.GetServiceListChannel(client, nsQuery, 1),
		// List and error channels to Ingresses.
		IngressList: common.GetIngressListChannel(client, nsQuery, 1),
	}

	return GetDaemonSetListFromChannels(channels, dsQuery, metricClient)
}

// GetDaemonSetListFromChannels returns a list of all Daemon Set in the cluster
// reading required resource list once from the channels.
func GetDaemonSetListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery,
	metricClient metricapi.MetricClient) (*DaemonSetList, error) {

	daemonSets := <-channels.DaemonSetList.List
	err := <-channels.DaemonSetList.Error
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
		DaemonSets: daemonSets.Items,
		Pods:       pods.Items,
		Events:     events.Items,
		Services:   ss.Items,
		Ingresses:  is.Items,
	}
	dsList := toDaemonSetList(rc, nonCriticalErrors, dsQuery, metricClient)
	return dsList, nil
}

func toDaemonSetList(rc *common.ResourceCollection, nonCriticalErrors []error,
	dsQuery *dataselect.DataSelectQuery, metricClient metricapi.MetricClient) *DaemonSetList {

	daemonSetList := &DaemonSetList{
		DaemonSets: make([]DaemonSet, 0),
		ListMeta:   api.ListMeta{TotalItems: len(rc.DaemonSets)},
		Errors:     nonCriticalErrors,
	}

	if len(rc.DaemonSets) == 0 {
		return daemonSetList
	}

	cachedResources := &metricapi.CachedResources{
		Pods: rc.Pods,
	}

	dsCells, metricPromises, filteredTotal := dataselect.GenericDataSelectWithFilterAndMetrics(ToCells(rc.DaemonSets),
		dsQuery, cachedResources, metricClient)
	daemonSets := FromCells(dsCells)
	daemonSetList.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for _, daemonSet := range daemonSets {
		matchingPods := common.FilterPodsByControllerRef(&daemonSet, rc.Pods)
		_, visitAddresses := network.GetNetworkInfo(daemonSet.Spec.Template.Spec.Containers, rc.Ingresses, rc.Services, daemonSet.Namespace, daemonSet.Spec.Template.Labels)
		podInfo := common.GetPodControllerInfo(daemonSet.Status.CurrentNumberScheduled, &daemonSet.Status.DesiredNumberScheduled, daemonSet.GetObjectMeta(), matchingPods, rc.Events)
		daemonSetList.DaemonSets = append(daemonSetList.DaemonSets, DaemonSet{
			ObjectMeta:          api.NewObjectMeta(daemonSet.ObjectMeta),
			TypeMeta:            api.NewTypeMeta(api.ResourceKindDaemonSet),
			ContainerImages:     common.GetContainerImages(&daemonSet.Spec.Template.Spec),
			InitContainerImages: common.GetInitContainerImages(&daemonSet.Spec.Template.Spec),
			VisitAddresses:      visitAddresses,
			Status:              common.GetControllerStatus(&podInfo),
			PodInfo:             podInfo,
		})
	}

	cumulativeMetrics, err := metricPromises.GetMetrics()
	daemonSetList.CumulativeMetrics = cumulativeMetrics
	if err != nil {
		daemonSetList.CumulativeMetrics = make([]metricapi.Metric, 0)
	}

	return daemonSetList
}

func ToDaemonSetList(res []common.Resource) (list []DaemonSet) {
	var (
		ok bool
		cm DaemonSet
	)
	list = make([]DaemonSet, 0, len(res))
	for _, r := range res {
		if cm, ok = r.(DaemonSet); ok {
			list = append(list, cm)
		}
	}
	return
}

func GenerateFromCore(app appCore.Application, rc *common.ResourceCollection, metricClient metricapi.MetricClient) (*DaemonSetList, error) {
	daemonSets, err := GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.DaemonSets = daemonSets
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
	return toDaemonSetList(rc, nonCriticalErrors, dataselect.NoDataSelect, metricClient), nil
}
