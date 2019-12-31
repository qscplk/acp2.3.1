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

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/event"
	"alauda.io/diablo/src/backend/resource/pod"
	apps "k8s.io/api/apps/v1beta2"
	corev1 "k8s.io/api/core/v1"
	k8sClient "k8s.io/client-go/kubernetes"
)

// GetDaemonSetPods return list of pods targeting daemon set.
func GetDaemonSetPods(client k8sClient.Interface, metricClient metricapi.MetricClient,
	dsQuery *dataselect.DataSelectQuery, daemonSetName, namespace string) (*pod.PodList, error) {
	log.Printf("Getting replication controller %s pods in namespace %s", daemonSetName, namespace)

	pods, err := getRawDaemonSetPods(client, daemonSetName, namespace)
	if err != nil {
		return pod.EmptyPodList, err
	}

	events, err := event.GetPodsEvents(client, namespace, pods)
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	podList := pod.ToPodList(pods, events, nonCriticalErrors, dsQuery, metricClient)
	return &podList, nil
}

// Returns array of corev1 pods targeting daemon set with given name.
func getRawDaemonSetPods(client k8sClient.Interface, daemonSetName, namespace string) ([]corev1.Pod, error) {
	daemonSet, err := client.AppsV1beta2().DaemonSets(namespace).Get(daemonSetName, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	channels := &common.ResourceChannels{
		PodList: common.GetPodListChannel(client, common.NewSameNamespaceQuery(namespace), 1),
	}

	podList := <-channels.PodList.List
	if err := <-channels.PodList.Error; err != nil {
		return nil, err
	}

	matchingPods := common.FilterPodsByControllerRef(daemonSet, podList.Items)
	return matchingPods, nil
}

// Returns simple info about pods(running, desired, failing, etc.) related to given daemon set.
func getDaemonSetPodInfo(client k8sClient.Interface, daemonSet *apps.DaemonSet) (
	*common.PodInfo, error) {

	pods, err := getRawDaemonSetPods(client, daemonSet.Name, daemonSet.Namespace)
	if err != nil {
		return nil, err
	}

	podInfo := common.GetPodInfo(daemonSet.Status.CurrentNumberScheduled,
		&daemonSet.Status.DesiredNumberScheduled, pods)
	return &podInfo, nil
}