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

package replicationcontroller

import (
	"log"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/event"
	"k8s.io/api/core/v1"
	client "k8s.io/client-go/kubernetes"
)

// ReplicationControllerList contains a list of Replication Controllers in the cluster.
type ReplicationControllerList struct {
	ListMeta          api.ListMeta       `json:"listMeta"`
	CumulativeMetrics []metricapi.Metric `json:"cumulativeMetrics"`

	// Basic information about resources status on the list.
	Status common.ResourceStatus `json:"status"`

	// Unordered list of Replication Controllers.
	ReplicationControllers []ReplicationController `json:"replicationControllers"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetReplicationControllerList returns a list of all Replication Controllers in the cluster.
func GetReplicationControllerList(client client.Interface, nsQuery *common.NamespaceQuery,
	dsQuery *dataselect.DataSelectQuery, metricClient metricapi.MetricClient) (*ReplicationControllerList, error) {
	log.Print("Getting list of all replication controllers in the cluster")

	channels := &common.ResourceChannels{
		ReplicationControllerList: common.GetReplicationControllerListChannel(client, nsQuery, 1),
		PodList:                   common.GetPodListChannel(client, nsQuery, 1),
		EventList:                 common.GetEventListChannel(client, nsQuery, 1),
	}

	return GetReplicationControllerListFromChannels(channels, dsQuery, metricClient)
}

// GetReplicationControllerListFromChannels returns a list of all Replication Controllers in the cluster
// reading required resource list once from the channels.
func GetReplicationControllerListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery,
	metricClient metricapi.MetricClient) (*ReplicationControllerList, error) {

	rcList := <-channels.ReplicationControllerList.List
	err := <-channels.ReplicationControllerList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	podList := <-channels.PodList.List
	err = <-channels.PodList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}

	eventList := <-channels.EventList.List
	err = <-channels.EventList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, criticalError
	}

	rcs := toReplicationControllerList(rcList.Items, dsQuery, podList.Items, eventList.Items, nonCriticalErrors,
		metricClient)
	rcs.Status = getStatus(rcList, podList.Items, eventList.Items)
	return rcs, nil
}

func toReplicationControllerList(replicationControllers []v1.ReplicationController, dsQuery *dataselect.DataSelectQuery,
	pods []v1.Pod, events []v1.Event, nonCriticalErrors []error, metricClient metricapi.MetricClient) *ReplicationControllerList {

	rcList := &ReplicationControllerList{
		ReplicationControllers: make([]ReplicationController, 0),
		ListMeta:               api.ListMeta{TotalItems: len(replicationControllers)},
		Errors:                 nonCriticalErrors,
	}
	cachedResources := &metricapi.CachedResources{
		Pods: pods,
	}
	rcCells, metricPromises, filteredTotal := dataselect.GenericDataSelectWithFilterAndMetrics(
		toCells(replicationControllers), dsQuery, cachedResources, metricClient)
	replicationControllers = fromCells(rcCells)
	rcList.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for _, rc := range replicationControllers {
		matchingPods := common.FilterPodsByControllerRef(&rc, pods)

		podInfo := common.GetPodInfo(rc.Status.Replicas, rc.Spec.Replicas, matchingPods)
		podInfo.Warnings = event.GetPodsEventWarnings(events, matchingPods)

		replicationController := ToReplicationController(&rc, &podInfo)
		rcList.ReplicationControllers = append(rcList.ReplicationControllers, replicationController)
	}

	cumulativeMetrics, err := metricPromises.GetMetrics()
	rcList.CumulativeMetrics = cumulativeMetrics
	if err != nil {
		rcList.CumulativeMetrics = make([]metricapi.Metric, 0)
	}

	return rcList
}
