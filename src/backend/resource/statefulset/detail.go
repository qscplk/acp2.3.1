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
	"sync"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/ingress"
	"alauda.io/diablo/src/backend/resource/network"
	"alauda.io/diablo/src/backend/resource/service"
	apps "k8s.io/api/apps/v1"
	core "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	client "k8s.io/client-go/kubernetes"
)

// StatefulSetDetail is a presentation layer view of Kubernetes Stateful Set resource. This means it is Stateful
// Set plus additional augmented data we can get from other sources (like services that target the same pods).
type StatefulSetDetail struct {
	ObjectMeta     api.ObjectMeta           `json:"objectMeta"`
	TypeMeta       api.TypeMeta             `json:"typeMeta"`
	PodInfo        common.PodControllerInfo `json:"podInfo"`
	Status         common.ControllerStatus  `json:"status"`
	VisitAddresses network.VisitAddress     `json:"visitAddresses"`
	Containers     []core.Container         `json:"containers"`
	// List of non-critical errors, that occurred during resource retrieval.
	VolumeInfos    []common.VolumeInfos           `json:"volumeInfos"`
	UpdateStrategy apps.StatefulSetUpdateStrategy `json:"updateStrategy"`
	Data           *apps.StatefulSet              `json:"data"`
	Errors         []error                        `json:"errors"`
}

func (detail StatefulSetDetail) GetObjectMeta() api.ObjectMeta {
	return detail.ObjectMeta
}

// GetDeploymentDetail func
func GetStatefulSetDetail(client client.Interface, namespace string, deploymentName string) (detail *StatefulSetDetail, err error) {
	statefulSet, err := GetStatefulSetDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return nil, err
	}
	detail, err = generateStaefulSetDetail(client, statefulSet, namespace)
	return
}

func generateStaefulSetDetail(client client.Interface, statefulSet *apps.StatefulSet, namespace string) (detail *StatefulSetDetail, err error) {
	selector, err := metaV1.LabelSelectorAsSelector(statefulSet.Spec.Selector)
	if err != nil {
		return nil, err
	}
	options := metaV1.ListOptions{LabelSelector: selector.String()}
	nsQuery := common.NewSameNamespaceQuery(namespace)
	channels := &common.ResourceChannels{
		ReplicaSetList: common.GetReplicaSetListChannelWithOptions(client,
			nsQuery, options, 1),
		PodList: common.GetPodListChannelWithOptions(client,
			nsQuery, options, 1),
		EventList: common.GetEventListChannel(client,
			nsQuery, 1),
		ServiceList: common.GetServiceListChannel(client,
			nsQuery, 1),
		// List and error channels to Ingresses.
		IngressList: common.GetIngressListChannel(client, nsQuery, 1),
	}
	detail, err = getStatefuleSetDetailFromChannels(statefulSet, channels)
	return
}

// getStatefuleSetDetailFromChannels returns a list of all Deployments in the cluster
// reading required resource list once from the channels.
func getStatefuleSetDetailFromChannels(statefulSet *apps.StatefulSet, channels *common.ResourceChannels) (*StatefulSetDetail, error) {

	pods := <-channels.PodList.List
	err := <-channels.PodList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	events := <-channels.EventList.List
	err = <-channels.EventList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}

	// rs := <-channels.ReplicaSetList.List
	// err = <-channels.ReplicaSetList.Error
	// nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	// if criticalError != nil {
	// 	return nil, criticalError
	// }

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
		Pods:      pods.Items,
		Events:    events.Items,
		Services:  ss.Items,
		Ingresses: is.Items,
	}
	detail := toStatefulSetDetail(statefulSet, rc, nonCriticalErrors)
	return detail, nil
}

func toStatefulSetDetail(statefulSet *apps.StatefulSet, rc *common.ResourceCollection, nonCriticalErrors []error) (detail *StatefulSetDetail) {
	matchPods := common.FilterPodsByControllerRef(statefulSet, rc.Pods)
	podInfo := common.GetPodControllerInfo(statefulSet.Status.Replicas, statefulSet.Spec.Replicas, statefulSet.GetObjectMeta(), matchPods, rc.Events)
	_, visitAddresses := network.GetNetworkInfo(statefulSet.Spec.Template.Spec.Containers, rc.Ingresses, rc.Services, statefulSet.Namespace, statefulSet.Spec.Template.Labels)
	detail = &StatefulSetDetail{
		ObjectMeta:     api.NewObjectMeta(statefulSet.ObjectMeta),
		TypeMeta:       api.NewTypeMeta(api.ResourceKindStatefulSet),
		PodInfo:        podInfo,
		VisitAddresses: visitAddresses,
		Status:         common.GetControllerStatus(&podInfo),
		Containers:     statefulSet.Spec.Template.Spec.Containers,
		VolumeInfos:    common.GetVolumeInfo(statefulSet.Spec.Template.Spec.Containers, statefulSet.Spec.Template.Spec.Volumes),
		UpdateStrategy: statefulSet.Spec.UpdateStrategy,
		Data:           statefulSet,
		Errors:         nonCriticalErrors,
	}
	return
}

func GenerateDetailFromCore(app appCore.Application, rc *common.ResourceCollection) (*[]StatefulSetDetail, error) {
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

	list := make([]StatefulSetDetail, 0, len(statefulSets))
	for _, item := range statefulSets {
		item := toStatefulSetDetail(&item, rc, make([]error, 0))
		list = append(list, *item)
	}
	return &list, nil
}

func GetStatefulSetDetailList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*[]StatefulSetDetail, error) {
	log.Print("Getting list of all Statefulset detail in the cluster")

	statefulSetList, err := GetOriginalList(client, nsQuery, dsQuery)
	if err != nil {
		return nil, err
	}
	var wait sync.WaitGroup
	var detailList []StatefulSetDetail
	for _, statefulSet := range statefulSetList.Items {
		wait.Add(1)
		go func(statefulSet apps.StatefulSet) {
			detail, err := generateStaefulSetDetail(client, &statefulSet, statefulSet.GetNamespace())
			if err == nil {
				detailList = append(detailList, *detail)
			}
			wait.Done()
		}(statefulSet)
	}
	wait.Wait()
	return &detailList, nil
}
