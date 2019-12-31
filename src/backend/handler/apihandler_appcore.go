package handler

import (
	"log"
	"net/http"
	"strings"

	catalog "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"

	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/application"
	"alauda.io/diablo/src/backend/resource/chart"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/deployment"
	"alauda.io/diablo/src/backend/resource/domainbinding"
	"alauda.io/diablo/src/backend/resource/network"
	"alauda.io/diablo/src/backend/resource/release"
	"github.com/emicklei/go-restful"
	apps "k8s.io/api/apps/v1"
)

func (apiHandler *APIHandler) handleGetDomainBindingList(request *restful.Request, response *restful.Response) {
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
	result, err := domainbinding.GetDomainBindingList(catalogClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateDomainBinding(request *restful.Request, response *restful.Response) {
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(domainbinding.DomainBindingSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := domainbinding.CreateDomainBinding(catalogClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDomainBindingDetail(request *restful.Request, response *restful.Response) {
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter(PathParameterName)

	result, err := domainbinding.GetDomainBindingDetail(catalogClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDomainBindingDetail(request *restful.Request, response *restful.Response) {
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter(PathParameterName)
	spec := new(domainbinding.DomainBindingSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := domainbinding.UpdateDomainBinding(catalogClient, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteDomainBindingDetail(request *restful.Request, response *restful.Response) {
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter(PathParameterName)

	err = domainbinding.DeleteDomainBinding(catalogClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, nil)
}

func (apiHandler *APIHandler) handleCreateApplication(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	Namespace := request.PathParameter(PathParameterNamespace)
	isDryRun := (strings.ToLower(request.QueryParameter("isDryRun")) == "true")
	spec := new(application.ApplicationSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	appResp, err := application.CreateApplication(appCoreClient, Namespace, spec, isDryRun)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, appResp)
}

// region Application
func (apiHandler *APIHandler) handleGetApplicationsList(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)

	// set the default sort by
	if len(dataSelect.SortQuery.SortByList) == 0 {
		sortBy := dataselect.SortBy{
			Property:  dataselect.PropertyName("name"),
			Ascending: true,
		}

		dataSelect.SortQuery.SortByList = append(dataSelect.SortQuery.SortByList, sortBy)
	}

	dataSelect.MetricQuery = dataselect.StandardMetrics
	namespace := request.PathParameter(PathParameterNamespace)
	result, err := application.GetApplicationList(appCoreClient, k8sClient, namespace, dataSelect, apiHandler.iManager.Metric().Client())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetApplicationDetail(request *restful.Request, response *restful.Response) {
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

	// todo short time used for pipeline
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	result, err := application.GetApplicationDetail(k8sClient, namespace, name, appCoreClient, apiHandler.iManager.Metric().Client(), devopsClient)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetApplicationYAML(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	result, err := application.GetApplicationYAML(*appCoreClient, apiHandler.iManager.Metric().Client(), namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateApplication(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(application.ApplicationSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	isDryRun := (strings.ToLower(request.QueryParameter("isDryRun")) == "true")
	appResp, err := application.UpdateApplication(appCoreClient, namespace, name, spec, isDryRun)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, appResp)
}

func (apiHandler *APIHandler) handleUpdateApplicationYAML(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(application.UpdateAppYAMLSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	ops, err := application.UpdateApplicationYAML(*appCoreClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, ops)
}

func (apiHandler *APIHandler) handleDeleteApplication(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(application.DeleteAppYAMLSpec)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	ops, err := application.DeleteApplicationYaml(*appCoreClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	//need to removed
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	err = release.DeleteRelease(catalogClient, namespace, name)
	log.Println(err)

	response.WriteHeaderAndEntity(http.StatusOK, ops)
}

func (apiHandler *APIHandler) handleGetChartDetail(request *restful.Request, response *restful.Response) {
	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	name := request.PathParameter(PathParameterName)
	chart, err := chart.GetDetailOriginal(catalogClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, chart)
}

func (apiHandler *APIHandler) handleReleaseCreate(request *restful.Request, response *restful.Response) {
	payload := &catalog.Release{}
	err := request.ReadEntity(payload)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := release.CreateRelease(catalogClient, payload)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
	return
}

func (apiHandler *APIHandler) handleGetReleaseDetail(request *restful.Request, response *restful.Response) {

	catalogClient, err := apiHandler.cManager.CatalogClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := release.GetReleaseDetail(catalogClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetDeploymentDetail(request *restful.Request, response *restful.Response) {
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
	name := request.PathParameter(PathParameterDeployment)
	result, err := deployment.GetDeploymentDetail(appCoreClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDeploymentNetwork(request *restful.Request, response *restful.Response) {
	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := &network.UpdateNetworkSpec{}
	err = request.ReadEntity(spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	err = deployment.UpdateNetwork(appCoreClient, k8sClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, true)
}

func (apiHandler *APIHandler) handleUpdateDeploymentDetail(request *restful.Request, response *restful.Response) {
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
	name := request.PathParameter(PathParameterDeployment)
	spec := new(deployment.DeploymentSpec)
	isDryRun := (strings.ToLower(request.QueryParameter("isDryRun")) == "true")
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.UpdateDeployment(appCoreClient, k8sClient, namespace, name, *spec, isDryRun)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateDeploymentDetailYaml(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	spec := new(apps.Deployment)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := deployment.UpdateDeploymentOriginal(k8sClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}
