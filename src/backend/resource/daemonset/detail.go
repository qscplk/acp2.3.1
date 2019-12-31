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

// DaemonSeDetail represents detailed information about a Daemon Set.
type DaemonSetDetail struct {
	ObjectMeta     api.ObjectMeta               `json:"objectMeta"`
	TypeMeta       api.TypeMeta                 `json:"typeMeta"`
	PodInfo        common.PodControllerInfo     `json:"podInfo"`
	Status         common.ControllerStatus      `json:"status"`
	VisitAddresses network.VisitAddress         `json:"visitAddresses"`
	Containers     []core.Container             `json:"containers"`
	VolumeInfos    []common.VolumeInfos         `json:"volumeInfos"`
	UpdateStrategy apps.DaemonSetUpdateStrategy `json:"updateStrategy"`
	Data           *apps.DaemonSet              `json:"data"`
	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (detail DaemonSetDetail) GetObjectMeta() api.ObjectMeta {
	return detail.ObjectMeta
}

// GetDeploymentDetail func
func GetDaemonSetDetail(client client.Interface, namespace string,
	name string) (detail *DaemonSetDetail, err error) {
	daemonSet, err := GetDaemonSetDetailOriginal(client, namespace, name)
	if err != nil {
		return nil, err
	}
	detail, err = generateDaemonSetDetail(client, daemonSet, namespace)
	return
}

func generateDaemonSetDetail(client client.Interface, daemonSet *apps.DaemonSet, namespace string) (detail *DaemonSetDetail, err error) {
	selector, err := metaV1.LabelSelectorAsSelector(daemonSet.Spec.Selector)
	if err != nil {
		return nil, err
	}
	options := metaV1.ListOptions{LabelSelector: selector.String(), ResourceVersion: "0"}
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
	detail, err = getDaemonSetDetailFromChannels(daemonSet, channels)
	return
}

// getDaemonSetDetailFromChannels returns a list of all Deployments in the cluster
// reading required resource list once from the channels.
func getDaemonSetDetailFromChannels(daemonSet *apps.DaemonSet, channels *common.ResourceChannels) (*DaemonSetDetail, error) {

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
	detail := toDaemonSetDetail(daemonSet, rc, nonCriticalErrors)
	return detail, nil
}

func toDaemonSetDetail(daemonSet *apps.DaemonSet, rc *common.ResourceCollection, nonCriticalErrors []error) (detail *DaemonSetDetail) {
	matchPods := common.FilterPodsByControllerRef(daemonSet, rc.Pods)
	podInfo := common.GetPodControllerInfo(daemonSet.Status.CurrentNumberScheduled, &daemonSet.Status.DesiredNumberScheduled, daemonSet.GetObjectMeta(), matchPods, rc.Events)
	_, visitAddresses := network.GetNetworkInfo(daemonSet.Spec.Template.Spec.Containers, rc.Ingresses, rc.Services, daemonSet.Namespace, daemonSet.Spec.Template.Labels)
	detail = &DaemonSetDetail{
		ObjectMeta:     api.NewObjectMeta(daemonSet.ObjectMeta),
		TypeMeta:       api.NewTypeMeta(api.ResourceKindDaemonSet),
		PodInfo:        podInfo,
		VisitAddresses: visitAddresses,
		Status:         common.GetControllerStatus(&podInfo),
		Containers:     daemonSet.Spec.Template.Spec.Containers,
		VolumeInfos:    common.GetVolumeInfo(daemonSet.Spec.Template.Spec.Containers, daemonSet.Spec.Template.Spec.Volumes),
		UpdateStrategy: daemonSet.Spec.UpdateStrategy,
		Data:           daemonSet,
		Errors:         nonCriticalErrors,
	}
	return
}

func GenerateDetailFromCore(app appCore.Application, rc *common.ResourceCollection) (*[]DaemonSetDetail, error) {
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

	list := make([]DaemonSetDetail, 0, len(daemonSets))
	for _, item := range daemonSets {
		item := toDaemonSetDetail(&item, rc, make([]error, 0))
		list = append(list, *item)
	}
	return &list, nil
}

func GetDaemonSetDetailList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*[]DaemonSetDetail, error) {
	log.Print("Getting list of all DaemonSet Detail in the cluster")

	daemonSetList, err := GetOriginalList(client, nsQuery, dsQuery)
	if err != nil {
		return nil, err
	}
	var wait sync.WaitGroup
	var detailList []DaemonSetDetail
	for _, daemonSet := range daemonSetList.Items {
		wait.Add(1)
		go func(daemonSet apps.DaemonSet) {
			detail, err := generateDaemonSetDetail(client, &daemonSet, daemonSet.GetNamespace())
			if err == nil {
				detailList = append(detailList, *detail)
			}
			wait.Done()
		}(daemonSet)
	}
	wait.Wait()
	return &detailList, nil
}
