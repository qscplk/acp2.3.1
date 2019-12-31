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

package deployment

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
	client "k8s.io/client-go/kubernetes"
)

// DeploymentList contains a list of Deployments in the cluster.
type DeploymentList struct {
	ListMeta          api.ListMeta       `json:"listMeta"`
	CumulativeMetrics []metricapi.Metric `json:"cumulativeMetrics"`

	// Basic information about resources status on the list.
	Status common.ResourceStatus `json:"status"`

	// Unordered list of Deployments.
	Deployments []Deployment `json:"deployments"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *DeploymentList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.Deployments))
		for i, d := range list.Deployments {
			res[i] = d
		}
	}

	return
}

// func (list *DeploymentList) ByLabelKey(key string) (aggr map[string][]common.Resource) {
//   if list.Deployments {

//   }

//   return
// }

// Deployment is a presentation layer view of Kubernetes Deployment resource. This means
// it is Deployment plus additional augmented data we can get from other sources
// (like services that target the same pods).
type Deployment struct {
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

type DeploymentSlice []Deployment

func (s DeploymentSlice) Len() int           { return len(s) }
func (s DeploymentSlice) Swap(i, j int)      { s[i], s[j] = s[j], s[i] }
func (s DeploymentSlice) Less(i, j int) bool { return s[i].ObjectMeta.Name < s[j].ObjectMeta.Name }

// GetObjectMeta object meta
func (d Deployment) GetObjectMeta() api.ObjectMeta {
	return d.ObjectMeta
}

// GetDeploymentList returns a list of all Deployments in the cluster.
func GetDeploymentList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery,
	metricClient metricapi.MetricClient) (*DeploymentList, error) {
	log.Print("Getting list of all deployments in the cluster")

	channels := &common.ResourceChannels{
		DeploymentList: common.GetDeploymentListChannel(client, nsQuery, 1),
		PodList:        common.GetPodListChannel(client, nsQuery, 1),
		EventList:      common.GetEventListChannel(client, nsQuery, 1),
		ReplicaSetList: common.GetReplicaSetListChannel(client, nsQuery, 1),
		// List and error channels to Services.
		ServiceList: common.GetServiceListChannel(client, nsQuery, 1),
		// List and error channels to Ingresses.
		IngressList: common.GetIngressListChannel(client, nsQuery, 1),
	}

	return GetDeploymentListFromChannels(channels, dsQuery, metricClient)
}

// GetDeploymentListFromChannels returns a list of all Deployments in the cluster
// reading required resource list once from the channels.
func GetDeploymentListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery,
	metricClient metricapi.MetricClient) (*DeploymentList, error) {

	deployments := <-channels.DeploymentList.List
	err := <-channels.DeploymentList.Error
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

	rs := <-channels.ReplicaSetList.List
	err = <-channels.ReplicaSetList.Error
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
		Deployments: deployments.Items,
		Pods:        pods.Items,
		Events:      events.Items,
		Services:    ss.Items,
		Ingresses:   is.Items,
		ReplicaSets: rs.Items,
	}

	deploymentList := toDeploymentList(rc, nonCriticalErrors, dsQuery, metricClient)
	// deploymentList.Status = getStatus(deployments, rs.Items, pods.Items, events.Items)
	return deploymentList, nil
}

func toDeploymentList(rc *common.ResourceCollection, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery, metricClient metricapi.MetricClient) *DeploymentList {
	deploymentList := &DeploymentList{
		Deployments: make([]Deployment, 0),
		ListMeta:    api.ListMeta{TotalItems: len(rc.Deployments)},
		Errors:      nonCriticalErrors,
	}
	if len(rc.Deployments) == 0 {
		return deploymentList
	}

	cachedResources := &metricapi.CachedResources{
		Pods: rc.Pods,
	}

	deploymentCells, metricPromises, filteredTotal := dataselect.GenericDataSelectWithFilterAndMetrics(
		toCells(rc.Deployments), dsQuery, cachedResources, metricClient)
	deployments := fromCells(deploymentCells)
	deploymentList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	for _, deployment := range deployments {
		_, visitAddresses := network.GetNetworkInfo(deployment.Spec.Template.Spec.Containers, rc.Ingresses, rc.Services, deployment.Namespace, deployment.Spec.Template.Labels)
		matchingPods := common.FilterDeploymentPodsByOwnerReference(deployment, rc.ReplicaSets, rc.Pods)
		podInfo := common.GetPodControllerInfo(deployment.Status.Replicas, deployment.Spec.Replicas, deployment.GetObjectMeta(), matchingPods, rc.Events)
		deploymentList.Deployments = append(deploymentList.Deployments,
			Deployment{
				ObjectMeta:          api.NewObjectMeta(deployment.ObjectMeta),
				TypeMeta:            api.NewTypeMeta(api.ResourceKindDeployment),
				ContainerImages:     common.GetContainerImages(&deployment.Spec.Template.Spec),
				InitContainerImages: common.GetInitContainerImages(&deployment.Spec.Template.Spec),
				PodInfo:             podInfo,
				VisitAddresses:      visitAddresses,
				Status:              common.GetControllerStatus(&podInfo),
			})
	}

	cumulativeMetrics, err := metricPromises.GetMetrics()
	deploymentList.CumulativeMetrics = cumulativeMetrics
	if err != nil {
		deploymentList.CumulativeMetrics = make([]metricapi.Metric, 0)
	}

	return deploymentList
}

func GenerateFromCore(app appCore.Application, rc *common.ResourceCollection, metricClient metricapi.MetricClient) (*DeploymentList, error) {
	deployments, err := GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.Deployments = deployments
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
	return toDeploymentList(rc, nonCriticalErrors, dataselect.NoDataSelect, metricClient), nil
}
