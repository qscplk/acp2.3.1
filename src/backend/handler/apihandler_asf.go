package handler

import (
	"net/http"
	"strings"

	"strconv"

	"alauda.io/diablo/src/backend/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/domain"
	msApp "alauda.io/diablo/src/backend/resource/microservicesapplication"
	msComp "alauda.io/diablo/src/backend/resource/microservicescomponent"
	msConfig "alauda.io/diablo/src/backend/resource/microservicesconfiguration"
	msEnv "alauda.io/diablo/src/backend/resource/microservicesenvironment"
	"github.com/emicklei/go-restful"
	v1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
)

// AsfAPIs
func (apiHandler *APIHandler) handleMicroservicesEnvironmentList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)

	projectName := request.QueryParameter("project_name")
	//namespace := parseNamespacePathParameter(request)

	// // TODO: Add asf client here
	result, err := msEnv.GetMicroservicesEnvironmentDetailList(asfClient, k8sClient, projectName, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetMicroservicesEnviromentDetail(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	cataClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	//dataSelect := parseDataSelectPathParameter(request)

	name := request.PathParameter("name")

	// // TODO: Add asf client here
	result, err := msEnv.GetMicroservicesEnvironmentDetail(asfClient, k8sClient, cataClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)

	// // TODO: Add asf client here

}

type RawValues struct {
	// Name of the application.
	RawValues string `json:"rawValues"`
}

// component update and component install
func (apiHandler *APIHandler) handlePutMicroservicesComponent(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	payload := new(RawValues)
	err := request.ReadEntity(&payload)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if payload.RawValues == "" {
		kdErrors.HandleInternalError(response, errors.NewBadRequest("the rawValues in the data can't be empty"))
		return
	}

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	asfDetail, err := msComp.GetMicroservicesComponentDetail(asfClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfDetail.Spec.RawValues = payload.RawValues
	result, err := msComp.UpdateMicroservicesComponent(asfClient, namespace, name, asfDetail)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) getPodControllerDetails(request *restful.Request, response *restful.Response, namespace string, name string) ([]*v1.Deployment, []*v1.StatefulSet) {
	var deployDetails []*v1.Deployment
	var statefulDetails []*v1.StatefulSet

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return deployDetails, statefulDetails
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return deployDetails, statefulDetails
	}

	result, err := msComp.GetMicroservicesComponentDetail(asfClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}

	for _, deploy := range result.Spec.DeploymentRefs {
		detail, err := k8sClient.Apps().Deployments(namespace).Get(deploy.Name, api.GetOptionsInCache)
		deployDetails = append(deployDetails, detail)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return deployDetails, statefulDetails
		}
	}

	for _, stateful := range result.Spec.StatefulSetRefs {
		stateful, err := k8sClient.Apps().StatefulSets(namespace).Get(stateful.Name, api.GetOptionsInCache)
		statefulDetails = append(statefulDetails, stateful)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return deployDetails, statefulDetails
		}
	}
	return deployDetails, statefulDetails
}

func (apiHandler *APIHandler) updatePodControllerDetails(request *restful.Request, response *restful.Response, deployDetails []*v1.Deployment, statefulDetails []*v1.StatefulSet) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}

	for _, deploy := range deployDetails {
		_, err := k8sClient.Apps().Deployments(deploy.Namespace).Update(deploy)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
	}

	for _, stateful := range statefulDetails {
		_, err := k8sClient.Apps().StatefulSets(stateful.Namespace).Update(stateful)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
	}
	return
}

// component stop and start
func (apiHandler *APIHandler) handlePutMicroservicesComponentStart(request *restful.Request, response *restful.Response) {

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	deployDetails, statefulDetails := apiHandler.getPodControllerDetails(request, response, namespace, name)
	for _, deploy := range deployDetails {
		num64, err := strconv.ParseInt(deploy.ObjectMeta.Annotations["asf.alauda.io/lastReplicas"], 10, 0)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		num := int32(num64)
		deploy.Spec.Replicas = &num
	}
	for _, stateful := range statefulDetails {
		num64, err := strconv.ParseInt(stateful.ObjectMeta.Annotations["asf.alauda.io/lastReplicas"], 10, 0)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		num := int32(num64)
		stateful.Spec.Replicas = &num
	}
	apiHandler.updatePodControllerDetails(request, response, deployDetails, statefulDetails)
	return
}

// component stop and start
func (apiHandler *APIHandler) handlePutMicroservicesComponentStop(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	deployDetails, statefulDetails := apiHandler.getPodControllerDetails(request, response, namespace, name)
	num := int32(0)
	for _, deploy := range deployDetails {
		deploy.ObjectMeta.Annotations["asf.alauda.io/lastReplicas"] = strconv.Itoa(int(*deploy.Spec.Replicas))
		deploy.Spec.Replicas = &num
	}
	for _, stateful := range statefulDetails {
		stateful.ObjectMeta.Annotations["asf.alauda.io/lastReplicas"] = strconv.Itoa(int(*stateful.Spec.Replicas))
		stateful.Spec.Replicas = &num
	}
	apiHandler.updatePodControllerDetails(request, response, deployDetails, statefulDetails)
	return
}
func (apiHandler *APIHandler) handleGetMicroservicesComponentBinding(request *restful.Request, response *restful.Response) {
	/*	k8sClient, err := apiHandler.cManager.Client(request)
			if err != nil {
				kdErrors.HandleInternalError(response, err)
				return
			}
			asfClient, err := apiHandler.cManager.ASFClient(request)
			 if err != nil {
				kdErrors.HandleInternalError(response, err)
		 	return
			}

			 dataSelect := parseDataSelectPathParameter(request)
			 namespace := parseNamespacePathParameter(request)
			 result, err := jenkinsbinding.GetMicroservicesComponentBindingList(asfClient, k8sClient, namespace, dataSelect)
			 if err != nil {
			 	kdErrors.HandleInternalError(response, err)
			 	return
			 }
			 response.WriteHeaderAndEntity(http.StatusOK, result)
	*/
}

func (apiHandler *APIHandler) handleGetMicroservicesApps(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)

	projectName := request.QueryParameter("project_name")
	//namespace := parseNamespacePathParameter(request)

	// // TODO: Add asf client here
	result, err := msApp.GetMicroservicesApplicationList(asfClient, k8sClient, projectName, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// AsfAPIs
func (apiHandler *APIHandler) handleGetMicroservicesConfigs(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)

	projectName := request.QueryParameter("project_name")
	appName := strings.ToLower(request.QueryParameter("app_name"))
	label := strings.ToLower(request.QueryParameter("label"))
	profile := strings.ToLower(request.QueryParameter("profile"))
	//namespace := parseNamespacePathParameter(request)

	// // TODO: Add asf client here
	result, err := msConfig.GetMicroservicesConfigurationList(asfClient, k8sClient, projectName, appName, profile, label, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// AsfAPIs
func (apiHandler *APIHandler) handleDomainList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	asfClient, err := apiHandler.cManager.ASFClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)

	projectName := request.QueryParameter("project_name")
	//namespace := parseNamespacePathParameter(request)

	// // TODO: Add asf client here
	result, err := msEnv.GetMicroservicesEnvironmentDetailList(asfClient, k8sClient, projectName, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDomainList(request *restful.Request, response *restful.Response) {
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	dataSelect := parseDataSelectPathParameter(request)
	// set the default sort by
	if len(dataSelect.SortQuery.SortByList) == 0 {
		sortBy := dataselect.SortBy{
			Property:  dataselect.PropertyName("creationTimestamp"),
			Ascending: false,
		}

		dataSelect.SortQuery.SortByList = append(dataSelect.SortQuery.SortByList, sortBy)
	}

	// // TODO: Add asf client here
	result, err := domain.GetDomainList(catalogClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
