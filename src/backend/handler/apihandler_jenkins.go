package handler

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/jenkins"
	"alauda.io/diablo/src/backend/resource/jenkinsbinding"
	"github.com/emicklei/go-restful"
	"net/http"
)

func (apiHandler *APIHandler) handleGetJenkins(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	// TODO: Add devops client here
	result, err := jenkins.GetJenkinsList(devopsClient, k8sClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleRetriveJenkins(request *restful.Request, response *restful.Response) {
	name := request.PathParameter("name")

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := jenkins.RetrieveJenkins(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
	return
}

func (apiHandler *APIHandler) handlePutJenkins(request *restful.Request, response *restful.Response) {
	name := request.PathParameter("name")

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	newJenkins := new(v1alpha1.Jenkins)
	if err := request.ReadEntity(newJenkins); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := jenkins.UpdateJenkins(devopsClient, newJenkins, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
	return
}

func (apiHandler *APIHandler) handleCreateJenkins(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	newJenkins := new(v1alpha1.Jenkins)
	if err := request.ReadEntity(newJenkins); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := jenkins.CreateJenkins(devopsClient, newJenkins)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteJenkins(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	err = jenkins.DeleteJenkins(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleDeleteJenkinsBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = jenkinsbinding.DeleteJenkinsBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleGetJenkinsBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := jenkinsbinding.GetJenkinsBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetJenkinsBindingList(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := jenkinsbinding.GetJenkinsBindingList(devopsClient, k8sClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateJenkinsBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	binding := new(v1alpha1.JenkinsBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	_, err = jenkins.AuthorizeService(devopsClient,
		binding.Spec.Jenkins.Name, binding.GetSecretName(), binding.GetSecretNamespace())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	result, err := jenkinsbinding.CreateJenkinsBinding(devopsClient, binding, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleUpdateJenkinsBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	binding := new(v1alpha1.JenkinsBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	_, err = jenkins.AuthorizeService(devopsClient,
		binding.Spec.Jenkins.Name, binding.GetSecretName(), binding.GetSecretNamespace())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	oldBinding, err := jenkinsbinding.GetJenkinsBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	newBinding, err := jenkinsbinding.UpdateJenkinsBinding(devopsClient, oldBinding, binding)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, newBinding)
}

func (apiHandler *APIHandler) handleGetJenkinsResources(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := jenkins.GetJenkinsResources(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
	return
}

func (apiHandler *APIHandler) handleGetJenkinsBindingResources(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := jenkinsbinding.GetJenkinsBindingResources(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
