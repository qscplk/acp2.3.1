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

package handler

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	clientapi "alauda.io/diablo/src/backend/client/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/integration"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/cluster"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/config"
	"alauda.io/diablo/src/backend/resource/configmap"
	"alauda.io/diablo/src/backend/resource/container"
	"github.com/emicklei/go-restful"
	appsv1 "k8s.io/api/apps/v1"
	authv1 "k8s.io/api/authorization/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/remotecommand"

	"alauda.io/diablo/src/backend/resource/cronjob"
	"alauda.io/diablo/src/backend/resource/daemonset"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/deployment"
	"alauda.io/diablo/src/backend/resource/discovery"
	"alauda.io/diablo/src/backend/resource/endpoint"
	"alauda.io/diablo/src/backend/resource/event"
	"alauda.io/diablo/src/backend/resource/horizontalpodautoscaler"
	"alauda.io/diablo/src/backend/resource/ingress"
	"alauda.io/diablo/src/backend/resource/job"
	"alauda.io/diablo/src/backend/resource/logs"
	ns "alauda.io/diablo/src/backend/resource/namespace"
	"alauda.io/diablo/src/backend/resource/node"
	"alauda.io/diablo/src/backend/resource/overview"
	"alauda.io/diablo/src/backend/resource/persistentvolume"
	"alauda.io/diablo/src/backend/resource/persistentvolumeclaim"
	"alauda.io/diablo/src/backend/resource/pod"
	"alauda.io/diablo/src/backend/resource/rbacrolebindings"
	"alauda.io/diablo/src/backend/resource/rbacroles"
	"alauda.io/diablo/src/backend/resource/replicaset"
	"alauda.io/diablo/src/backend/resource/replicationcontroller"
	"alauda.io/diablo/src/backend/resource/rolebinding"
	"alauda.io/diablo/src/backend/resource/secret"
	resourceService "alauda.io/diablo/src/backend/resource/service"
	"alauda.io/diablo/src/backend/resource/statefulset"
	"alauda.io/diablo/src/backend/resource/storageclass"
	"alauda.io/diablo/src/backend/resource/workload"
	"alauda.io/diablo/src/backend/scaling"
	settingsApi "alauda.io/diablo/src/backend/settings/api"
	"alauda.io/diablo/src/backend/validation"
)

const (
	// RequestLogString is a template for request log message.
	RequestLogString = "[%s] Incoming %s %s %s request from %s"

	// ResponseLogString is a template for response log message.
	ResponseLogString = "[%s] Outcoming response to %s with %d status code"

	// PathParameterContainer is the path parameter name of container
	PathParameterContainer = "container"
	// PathParameterDaemonset is the path parameter name of daemonset
	PathParameterDaemonset = "daemonset"
	// PathParameterDeployment is the path parameter name of deployment
	PathParameterDeployment = "deployment"
	// PathParameterStatefulset is the path parameter name of statefulset
	PathParameterStatefulset = "statefulset"
	// PathParameterhorizontalpodautoscaler is the path parameter name of horizontalpodautoscaler
	PathParameterhorizontalpodautoscaler = "horizontalpodautoscaler"
	// PathParameterhorizontalType is the path parameter name of horizontaltype
	PathParameterhorizontalType = "horizontaltype"
	// PathParameterNamespace is the path parameter name of namespace
	PathParameterNamespace = "namespace"
	// PathParameterName is the path parameter name of resource
	PathParameterName = "name"
	// PathParameterServiceName is the path parameter servicename of resource
	PathParameterServiceName = "servicename"
	PolicyType               = "policyType"
)

// APIHandler is a representation of API handler. Structure contains clientapi, Heapster clientapi and clientapi configuration.
type APIHandler struct {
	iManager integration.IntegrationManager
	cManager clientapi.DevOpsClientManager
	// sManager settings.SettingsManager
	sManager settingsApi.SettingsManager

	groupValidator APIGroupValidator
}

// TODO: Handle case in which RBAC feature is not enabled in API server. Currently returns 404 resource not found
func (apiHandler *APIHandler) handleGetRbacRoleList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := rbacroles.GetRbacRoleList(k8sClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// TODO: Handle case in which RBAC feature is not enabled in API server. Currently returns 404 resource not found
func (apiHandler *APIHandler) handleGetRbacRoleBindingList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := rbacrolebindings.GetRbacRoleBindingList(k8sClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCanI(request *restful.Request, response *restful.Response) {

	payload := new(authv1.SelfSubjectAccessReviewSpec)
	if err := request.ReadEntity(payload); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	accessReview := &authv1.SelfSubjectAccessReview{Spec: *payload}
	apiHandler.handleSelfSubjectAccessReview(accessReview, request, response)
}

func (apiHandler *APIHandler) handleCanIAdmin(request *restful.Request, response *restful.Response) {
	// initial set an admin to be the same as the creator of project
	// maybe not that right, but good for now
	accessReview := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:     "create",
				Group:    "auth.alauda.io",
				Version:  "v1alpha1",
				Resource: "projects",
			},
		},
	}
	apiHandler.handleSelfSubjectAccessReview(accessReview, request, response)
}

func (apiHandler *APIHandler) handleSelfSubjectAccessReview(accessReview *authv1.SelfSubjectAccessReview, request *restful.Request, response *restful.Response) {
	allowed := common.CanIResponse{Allowed: apiHandler.cManager.CanI(request, accessReview)}
	response.WriteHeaderAndEntity(http.StatusOK, allowed)
}

// handleGetAPIGroups handle
func (apiHandler *APIHandler) handleGetAPIGroups(request *restful.Request, response *restful.Response) {
	client, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	list, err := client.Discovery().ServerGroups()
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	// lets filter out groups based on license
	if list != nil && len(list.Groups) > 0 {
		for i := 0; i < len(list.Groups); i++ {
			item := list.Groups[i]
			// remove from list if it fails validation
			if !apiHandler.groupValidator.Has(item.Name) {
				list.Groups = append(list.Groups[:i], list.Groups[i+1:]...)
				i--
			}
		}
	}
	response.WriteHeaderAndEntity(http.StatusOK, list)
}

func (apiHandler *APIHandler) handleRbacStatus(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := validation.ValidateRbacStatus(k8sClient)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStatefulSetList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := statefulset.GetStatefulSetList(k8sClient, namespace, dataSelect,
		apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStatefulSetDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	result, err := statefulset.GetStatefulSetDetail(k8sClient, namespace, name)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateStatefulSetDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	spec := new(appsv1.StatefulSet)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.UpdateStatefulSetOriginal(k8sClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateStatefulSetContainerEnv(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerEnvRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.UpdateContainerEnv(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateStatefulSetContainerResource(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerResourceRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.UpdateContainerResource(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateStatefulSetContainerImage(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerImageRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.UpdateContainerImage(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePutStatefulSetContainer(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("statefulset")
	containerName := request.PathParameter("container")
	isDryRun := (strings.ToLower(request.QueryParameter("isDryRun")) == "true")
	spec := new(container.UpdateContainerRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.PutStatefulsetContainer(k8sClient, namespace, name, containerName, isDryRun, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateStatefulSetVolumeMount(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(common.VolumeInfo)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.CreateStatefulSetVolumeMount(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateStatefulSetReplicas(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	spec := new(statefulset.StatefulSetReplica)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := statefulset.UpdateStatefulSetReplica(k8sClient, namespace, name, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStatefulSetPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := statefulset.GetStatefulSetPods(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, name, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStatefulSetEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetServiceList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := resourceService.GetServiceList(k8sClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetServiceListByProject(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := resourceService.GetServiceNameListByProject(k8sClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetServiceEndpoints(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("service")
	result, err := endpoint.GetServiceEndpoints(k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetServiceDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("service")
	// dataSelect := parseDataSelectPathParameter(request)
	// dataSelect.MetricQuery = dataselect.StandardMetrics
	// result, err := resourceService.GetServiceDetail(k8sClient, apiHandler.iManager.Metric().Client(), namespace, name, dataSelect)
	result, err := resourceService.GetOriginal(k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetIngressDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	result, err := ingress.GetIngressDetail(k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetIngressList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := ingress.GetIngressList(k8sClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetServicePods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("service")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := resourceService.GetServicePods(k8sClient, apiHandler.iManager.Metric().Client(), namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetNodeList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := node.GetNodeList(k8sClient, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCluster(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.NoMetrics
	result, err := cluster.GetCluster(k8sClient, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetNodeDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := node.GetNodeDetail(k8sClient, apiHandler.iManager.Metric().Client(), name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetNodeEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := event.GetNodeEvents(k8sClient, dataSelect, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetNodePods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := node.GetNodePods(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeploy(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appDeploymentSpec := new(deployment.AppDeploymentSpec)
	if err := request.ReadEntity(appDeploymentSpec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	log.Println("has manager?", apiHandler.sManager)
	log.Println("has client?", k8sClient)

	devopsSettings := apiHandler.sManager.GetDevopsSettings(k8sClient)
	if err := deployment.DeployApp(appDeploymentSpec, k8sClient, *devopsSettings); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, appDeploymentSpec)
}

func (apiHandler *APIHandler) handleScaleResource(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	kind := request.PathParameter("kind")
	name := request.PathParameter("name")
	count := request.QueryParameter("scaleBy")
	replicaCountSpec, err := scaling.ScaleResource(k8sClient, kind, namespace, name, count)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, replicaCountSpec)
}

func (apiHandler *APIHandler) handleGetReplicaCount(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	kind := request.PathParameter("kind")
	name := request.PathParameter("name")
	scaleSpec, err := scaling.GetScaleSpec(k8sClient, kind, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, scaleSpec)
}

// func (apiHandler *APIHandler) handleDeployFromFile(request *restful.Request, response *restful.Response) {
// 	cfg, err := apiHandler.cManager.Config(request)
// 	if err != nil {
// 		kdErrors.HandleInternalError(response, err)
// 		return
// 	}

// 	deploymentSpec := new(deployment.AppDeploymentFromFileSpec)
// 	if err := request.ReadEntity(deploymentSpec); err != nil {
// 		kdErrors.HandleInternalError(response, err)
// 		return
// 	}

// 	isDeployed, err := deployment.DeployAppFromFile(cfg, deploymentSpec)
// 	if !isDeployed {
// 		kdErrors.HandleInternalError(response, err)
// 		return
// 	}

// 	errorMessage := ""
// 	if err != nil {
// 		errorMessage = err.Error()
// 	}

// 	response.WriteHeaderAndEntity(http.StatusCreated, deployment.AppDeploymentFromFileResponse{
// 		Name:    deploymentSpec.Name,
// 		Content: deploymentSpec.Content,
// 		Error:   errorMessage,
// 	})
// }

func (apiHandler *APIHandler) handleNameValidity(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(validation.AppNameValiditySpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	validity, err := validation.ValidateAppName(spec, k8sClient)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, validity)
}

func (APIHandler *APIHandler) handleImageReferenceValidity(request *restful.Request, response *restful.Response) {
	spec := new(validation.ImageReferenceValiditySpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	validity, err := validation.ValidateImageReference(spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, validity)
}

func (apiHandler *APIHandler) handleProtocolValidity(request *restful.Request, response *restful.Response) {
	spec := new(validation.ProtocolValiditySpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, validation.ValidateProtocol(spec))
}

func (apiHandler *APIHandler) handleGetAvailableProcotols(request *restful.Request, response *restful.Response) {
	response.WriteHeaderAndEntity(http.StatusOK, deployment.GetAvailableProtocols())
}

func (apiHandler *APIHandler) handleGetReplicationControllerList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := replicationcontroller.GetReplicationControllerList(k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetWorkloads(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.NoMetrics
	result, err := workload.GetWorkloads(k8sClient, apiHandler.iManager.Metric().Client(), namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleOverview(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.FilterQuery = dataselect.NoFilter
	dataSelect.MetricQuery = dataselect.NoMetrics
	result, err := overview.GetOverview(k8sClient, appCoreClient, apiHandler.iManager.Metric().Client(), namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDiscovery(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dsQuery := parseDataSelectPathParameter(request)
	result, err := discovery.GetDiscovery(k8sClient, namespace, dsQuery)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetConfig(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dsQuery := parseDataSelectPathParameter(request)
	result, err := config.GetConfig(k8sClient, appCoreClient, namespace, dsQuery)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicaSets(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := replicaset.GetReplicaSetList(k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicaSetDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	replicaSet := request.PathParameter("replicaSet")
	result, err := replicaset.GetReplicaSetDetail(k8sClient, apiHandler.iManager.Metric().Client(), namespace, replicaSet)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicaSetPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	replicaSet := request.PathParameter("replicaSet")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := replicaset.GetReplicaSetPods(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, replicaSet, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicaSetServices(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	replicaSet := request.PathParameter("replicaSet")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := replicaset.GetReplicaSetServices(k8sClient, dataSelect, namespace, replicaSet)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicaSetEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("replicaSet")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)

}

func (apiHandler *APIHandler) handleGetPodEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	log.Println("Getting events related to a pod in namespace")
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("pod")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := pod.GetEventsForPod(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// Handles execute shell API call
func (apiHandler *APIHandler) handleExecShell(request *restful.Request, response *restful.Response) {
	sessionId, err := genTerminalSessionId()
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	cfg, err := apiHandler.cManager.Config(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	terminalSessions.Set(sessionId, TerminalSession{
		id:       sessionId,
		bound:    make(chan error),
		sizeChan: make(chan remotecommand.TerminalSize),
	})
	go WaitForTerminal(k8sClient, cfg, request, sessionId)
	response.WriteHeaderAndEntity(http.StatusOK, TerminalResponse{Id: sessionId})
}

func (apiHandler *APIHandler) handleGetDeployments(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := deployment.GetDeploymentList(k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDeploymentPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	podList, err := deployment.GetDeploymentPods(k8sClient, apiHandler.iManager.Metric().Client(),
		dataselect.DefaultDataSelectWithMetrics, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, podList)
}

func (apiHandler *APIHandler) handleUpdateDeploymentReplicas(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	spec := new(deployment.DeploymentReplica)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.UpdateDeploymentReplica(k8sClient, namespace, name, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDeploymentContainerEnv(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerEnvRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.UpdateContainerEnv(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDeploymentContainerImage(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerImageRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.UpdateContainerImage(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDeploymentContainerResources(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerResourceRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.UpdateContainerResource(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleRollBackDeploymentToRevision(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	spec := new(common.RevisionDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.RollBackToSpecialRevision(k8sClient, namespace, name, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePutDeploymentContainer(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("deployment")
	containerName := request.PathParameter("container")
	isDryRun := (strings.ToLower(request.QueryParameter("isDryRun")) == "true")
	spec := new(container.UpdateContainerRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.PutDeploymentContainer(k8sClient, namespace, name, containerName, isDryRun, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateDeploymentVolumeMount(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(common.VolumeInfo)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.CreateDeploymentVolumeMount(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDeploymentEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDeploymentOldReplicaSets(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := deployment.GetDeploymentOldReplicaSets(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics // download standard metrics - cpu, and memory - by default
	result, err := pod.GetPodList(k8sClient, apiHandler.iManager.Metric().Client(), namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPodDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("pod")
	result, err := pod.GetPodDetail(k8sClient, apiHandler.iManager.Metric().Client(), namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicationControllerDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("replicationController")
	result, err := replicationcontroller.GetReplicationControllerDetail(k8sClient, apiHandler.iManager.Metric().Client(), namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateReplicasCount(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("replicationController")
	spec := new(replicationcontroller.ReplicationControllerSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if err := replicationcontroller.UpdateReplicasCount(k8sClient, namespace, name, spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeader(http.StatusAccepted)
}

func (apiHandler *APIHandler) handleGetResource(request *restful.Request, response *restful.Response) {
	verber, err := apiHandler.cManager.VerberClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	kind := request.PathParameter("kind")
	namespace, ok := request.PathParameters()[PathParameterNamespace]
	name := request.PathParameter("name")
	result, err := verber.Get(kind, ok, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePutResource(
	request *restful.Request, response *restful.Response) {
	verber, err := apiHandler.cManager.VerberClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	kind := request.PathParameter("kind")
	namespace, ok := request.PathParameters()[PathParameterNamespace]
	name := request.PathParameter("name")
	putSpec := &runtime.Unknown{}
	if err := request.ReadEntity(putSpec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if err := verber.Put(kind, ok, namespace, name, putSpec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeader(http.StatusCreated)
}

func (apiHandler *APIHandler) handleDeleteResource(
	request *restful.Request, response *restful.Response) {
	verber, err := apiHandler.cManager.VerberClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	kind := request.PathParameter("kind")
	namespace, ok := request.PathParameters()[PathParameterNamespace]
	name := request.PathParameter("name")

	if err := verber.Delete(kind, ok, namespace, name); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeader(http.StatusOK)
}

func (apiHandler *APIHandler) handleGetReplicationControllerPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	rc := request.PathParameter("replicationController")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := replicationcontroller.GetReplicationControllerPods(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, rc, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateNamespace(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespaceSpec := new(ns.NamespaceSpec)
	if err := request.ReadEntity(namespaceSpec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if err := ns.CreateNamespace(namespaceSpec, k8sClient); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, namespaceSpec)
}

func (apiHandler *APIHandler) handleGetNamespaces(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := ns.GetNamespaceList(k8sClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleNewGetNamespaces(request *restful.Request, response *restful.Response) {

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	projectname := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := ns.GetNewNamespaceList(k8sClient, dataSelect, projectname)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetNamespaceDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := ns.GetNamespaceDetail(k8sClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetNamespaceEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := event.GetNamespaceEvents(k8sClient, dataSelect, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetSecretDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	result, err, _ := secret.GetSecretDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetSecretRelatedResources(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	devopsClient, dErr := apiHandler.cManager.DevOpsClient(request)
	if err != nil || dErr != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)

	result, err := secret.GetSecretRelatedResources(k8sClient, devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetSecretList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)

	var includePublic bool
	includePublicStr := request.QueryParameter("includePublic")
	if includePublicStr == "true" {
		includePublic = true
	}

	result, err := secret.GetSecretList(k8sClient, appCoreClient, namespace, dataSelect, includePublic)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateSecret(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	spec := new(secret.SecretDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := secret.CreateSecret(k8sClient, appCoreClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleUpdateSecret(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	spec := new(secret.SecretDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := secret.UpdateSecret(k8sClient, appCoreClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleUpdateSecretBelongApp(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(common.AppNameDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	result, err, originResource := secret.GetSecretDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	err = common.UpdateResourceBelongApplication(appCoreClient, originResource,
		namespace, result.AppName, spec.AppName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteSecret(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	name := request.PathParameter("name")
	err = secret.DeleteSecret(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleGetConfigMapList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := configmap.GetConfigMapList(k8sClient, appCoreClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetConfigMapDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("configmap")
	result, err, _ := configmap.GetConfigMapDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateConfigMap(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	spec := new(configmap.ConfigMapDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	curNamespace := common.GetCurNamespace(namespace)
	result, err := configmap.CreateConfigMap(k8sClient, appCoreClient, curNamespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleUpdateConfigMap(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	spec := new(configmap.ConfigMapDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := configmap.UpdateConfigMap(k8sClient, appCoreClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteConfigMap(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	err = configmap.DeleteConfigMap(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateConfigMapBelongApp(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(common.AppNameDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	result, err, originResource := configmap.GetConfigMapDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	err = common.UpdateResourceBelongApplication(appCoreClient, originResource,
		namespace, result.AppName, spec.AppName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPersistentVolumeList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := persistentvolume.GetPersistentVolumeList(k8sClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPersistentVolumeDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("persistentvolume")
	result, err := persistentvolume.GetPersistentVolumeDetail(k8sClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPersistentVolumeClaimList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := persistentvolumeclaim.GetPersistentVolumeClaimList(k8sClient, appCoreClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPersistentVolumeClaimDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	result, err, _ := persistentvolumeclaim.GetPersistentVolumeClaimDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreatePersistentVolumeClaim(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	spec := new(persistentvolumeclaim.PersistentVolumeClaimDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	curNamespace := common.GetCurNamespace(namespace)
	result, err := persistentvolumeclaim.CreatePersistentVolumeClaim(k8sClient, appCoreClient, curNamespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleUpdatePersistentVolumeClaim(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	spec := new(persistentvolumeclaim.PersistentVolumeClaimDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := persistentvolumeclaim.UpdatePersistentVolumeClaim(k8sClient, appCoreClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeletePersistentVolumeClaim(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	err = persistentvolumeclaim.DeletePersistentVolumeClaim(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdatePersistentVolumeClaimBelongApp(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(common.AppNameDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	result, err, originResource := persistentvolumeclaim.GetPersistentVolumeClaimDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	err = common.UpdateResourceBelongApplication(appCoreClient, originResource,
		namespace, result.AppName, spec.AppName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPodContainers(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("pod")
	result, err := container.GetPodContainers(k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicationControllerEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("replicationController")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetReplicationControllerServices(request *restful.Request,
	response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("replicationController")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := replicationcontroller.GetReplicationControllerServices(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDaemonSetList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := daemonset.GetDaemonSetList(k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDaemonSetDetail(
	request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	result, err := daemonset.GetDaemonSetDetail(k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDaemonSetDetail(
	request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	spec := new(appsv1.DaemonSet)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := daemonset.UpdateDeamonSetOriginal(k8sClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePutDaemonSetContainer(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("daemonset")
	containerName := request.PathParameter("container")
	isDryRun := (strings.ToLower(request.QueryParameter("isDryRun")) == "true")
	spec := new(container.UpdateContainerRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := daemonset.PutDaemonsetContainer(k8sClient, namespace, name, containerName, isDryRun, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDaemonSetContainerEnv(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerEnvRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := daemonset.UpdateContainerEnv(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDaemonSetContainerResource(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerResourceRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := daemonset.UpdateContainerResource(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDaemonSetContainerImage(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(container.UpdateContainerImageRequest)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := daemonset.UpdateContainerImage(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateDaemonSetVolumeMount(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	containerName := request.PathParameter(PathParameterContainer)
	spec := new(common.VolumeInfo)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := daemonset.CreateDaemonSetVolumeMount(k8sClient, namespace, name, containerName, *spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDaemonSetPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDaemonset)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := daemonset.GetDaemonSetPods(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, name, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDaemonSetServices(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	daemonSet := request.PathParameter("daemonSet")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := daemonset.GetDaemonSetServices(k8sClient, dataSelect, namespace, daemonSet)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDaemonSetEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("daemonSet")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetHorizontalPodAutoscalerList(request *restful.Request,
	response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	result, err := horizontalpodautoscaler.GetHorizontalPodAutoscalerList(k8sClient, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateHorizontalPodAutoscaler(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	spec := new(horizontalpodautoscaler.HorizontalPodAutoscalerDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := horizontalpodautoscaler.CreateHorizontalPodAutoscaler(k8sClient, appCoreClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteHorizontalPodAutoscaler(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterhorizontalpodautoscaler)
	err = horizontalpodautoscaler.DeleteHorizontalPodAutoscaler(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusNoContent, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateHorizontalPodAutoscaler(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterhorizontalpodautoscaler)
	spec := new(horizontalpodautoscaler.HorizontalPodAutoscalerDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := horizontalpodautoscaler.UpdateHorizontalPodAutoscaler(k8sClient, appCoreClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetHorizontalPodAutoscalerDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterhorizontalpodautoscaler)
	result, _, err := horizontalpodautoscaler.GetHorizontalPodAutoscalerDetail(k8sClient, appCoreClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetJobList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := job.GetJobList(k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetJobDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := job.GetJobDetail(k8sClient, apiHandler.iManager.Metric().Client(), namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetJobPods(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := job.GetJobPods(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetJobEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := job.GetJobEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCronJobList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := cronjob.GetCronJobList(k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCronJobDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err := cronjob.GetCronJobDetail(k8sClient, dataSelect, apiHandler.iManager.Metric().Client(), namespace,
		name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCronJobJobs(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := cronjob.GetCronJobJobs(k8sClient, apiHandler.iManager.Metric().Client(), dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCronJobEvents(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := cronjob.GetCronJobEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStorageClassList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := storageclass.GetStorageClassList(k8sClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStorageClass(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("storageclass")
	result, err := storageclass.GetStorageClass(k8sClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStorageClassPersistentVolumes(request *restful.Request,
	response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("storageclass")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := persistentvolume.GetStorageClassPersistentVolumes(k8sClient,
		name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPodPersistentVolumeClaims(request *restful.Request,
	response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("pod")
	namespace := request.PathParameter(PathParameterNamespace)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := persistentvolumeclaim.GetPodPersistentVolumeClaims(k8sClient,
		namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleLogSource(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resourceName := request.PathParameter("resourceName")
	resourceType := request.PathParameter("resourceType")
	namespace := request.PathParameter(PathParameterNamespace)
	logSources, err := logs.GetLogSources(k8sClient, namespace, resourceName, resourceType)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, logSources)
}

func (apiHandler *APIHandler) handleLogs(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	podID := request.PathParameter("pod")
	containerID := request.PathParameter(PathParameterContainer)

	refTimestamp := request.QueryParameter("referenceTimestamp")
	if refTimestamp == "" {
		refTimestamp = logs.NewestTimestamp
	}

	refLineNum, err := strconv.Atoi(request.QueryParameter("referenceLineNum"))
	if err != nil {
		refLineNum = 0
	}
	usePreviousLogs := request.QueryParameter("previous") == "true"
	offsetFrom, err1 := strconv.Atoi(request.QueryParameter("offsetFrom"))
	offsetTo, err2 := strconv.Atoi(request.QueryParameter("offsetTo"))
	logFilePosition := request.QueryParameter("logFilePosition")

	logSelector := logs.DefaultSelection
	if err1 == nil && err2 == nil {
		logSelector = &logs.Selection{
			ReferencePoint: logs.LogLineId{
				LogTimestamp: logs.LogTimestamp(refTimestamp),
				LineNum:      refLineNum,
			},
			OffsetFrom:      offsetFrom,
			OffsetTo:        offsetTo,
			LogFilePosition: logFilePosition,
		}
	}

	result, err := container.GetLogDetails(k8sClient, namespace, podID, containerID, logSelector, usePreviousLogs)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleLogFile(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	podID := request.PathParameter("pod")
	containerID := request.PathParameter(PathParameterContainer)
	usePreviousLogs := request.QueryParameter("previous") == "true"

	logStream, err := container.GetLogFile(k8sClient, namespace, podID, containerID, usePreviousLogs)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	handleDownload(response, logStream)
}

// RBAC
func (apiHandler *APIHandler) handleListRoleBindings(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := rolebinding.GetRoleBindingsList(k8sClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateRoleBinding(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	newRoleBinding := new(rbacv1.RoleBinding)
	if err := request.ReadEntity(newRoleBinding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	newRoleBinding.ObjectMeta.Namespace = namespace
	result, err := rolebinding.CreateRoleBinding(k8sClient, newRoleBinding)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleListRoleBindingsOriginal(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := rolebinding.GetRoleBindingsList(k8sClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteRoleBindingsOriginal(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter("name")
	err = rolebinding.DeleteRoleBinding(k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusNoContent, struct{}{})
}

// /RBAC

// parseNamespacePathParameter parses namespace selector for list pages in path parameter.
// The namespace selector is a comma separated list of namespaces that are trimmed.
// No namespaces means "view all user namespaces", i.e., everything except kube-system.
func parseNamespacePathParameter(request *restful.Request) *common.NamespaceQuery {
	namespace := request.PathParameter(PathParameterNamespace)
	namespaces := strings.Split(namespace, ",")
	var nonEmptyNamespaces []string
	for _, n := range namespaces {
		n = strings.Trim(n, " ")
		if len(n) > 0 {
			nonEmptyNamespaces = append(nonEmptyNamespaces, n)
		}
	}
	return common.NewNamespaceQuery(nonEmptyNamespaces)
}

func parsePaginationPathParameter(request *restful.Request) *dataselect.PaginationQuery {
	itemsPerPage, err := strconv.ParseInt(request.QueryParameter("itemsPerPage"), 10, 0)
	if err != nil {
		return dataselect.NoPagination
	}

	page, err := strconv.ParseInt(request.QueryParameter("page"), 10, 0)
	if err != nil {
		return dataselect.NoPagination
	}

	// Frontend pages start from 1 and backend starts from 0
	return dataselect.NewPaginationQuery(int(itemsPerPage), int(page-1))
}

func parseFilterPathParameter(request *restful.Request) *dataselect.FilterQuery {
	return dataselect.NewFilterQuery(strings.Split(request.QueryParameter("filterBy"), ","))
}

// Parses query parameters of the request and returns a SortQuery object
func parseSortPathParameter(request *restful.Request) *dataselect.SortQuery {
	return dataselect.NewSortQuery(strings.Split(request.QueryParameter("sortBy"), ","))
}

// Parses query parameters of the request and returns a MetricQuery object
func parseMetricPathParameter(request *restful.Request) *dataselect.MetricQuery {
	metricNamesParam := request.QueryParameter("metricNames")
	var metricNames []string
	if metricNamesParam != "" {
		metricNames = strings.Split(metricNamesParam, ",")
	} else {
		metricNames = nil
	}
	aggregationsParam := request.QueryParameter("aggregations")
	var rawAggregations []string
	if aggregationsParam != "" {
		rawAggregations = strings.Split(aggregationsParam, ",")
	} else {
		rawAggregations = nil
	}
	aggregationModes := metricapi.AggregationModes{}
	for _, e := range rawAggregations {
		aggregationModes = append(aggregationModes, metricapi.AggregationMode(e))
	}
	return dataselect.NewMetricQuery(metricNames, aggregationModes)

}

// Parses query parameters of the request and returns a DataSelectQuery object
func parseDataSelectPathParameter(request *restful.Request) *dataselect.DataSelectQuery {
	paginationQuery := parsePaginationPathParameter(request)
	sortQuery := parseSortPathParameter(request)
	filterQuery := parseFilterPathParameter(request)
	metricQuery := parseMetricPathParameter(request)
	return common.FilterByDisplaynameToLower(dataselect.NewDataSelectQuery(paginationQuery, sortQuery, filterQuery, metricQuery))
}
