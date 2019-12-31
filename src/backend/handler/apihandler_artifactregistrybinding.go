package handler

import (
	"alauda.io/diablo/src/backend/resource/artifactregistrybinding"
	"net/http"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"github.com/emicklei/go-restful"
)

func (apiHandler *APIHandler) handleCreateArtifactRegistryBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.ArtifactRegistryBinding)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := artifactregistrybinding.CreateArtifactRegistryBinding(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteArtifactRegistryBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	err = artifactregistrybinding.DeleteArtifactRegistryBinding(devopsClient, name, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateArtifactRegistryBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	spec := new(v1alpha1.ArtifactRegistryBinding)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := artifactregistrybinding.UpdateArtifactRegistryBinding(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetArtifactRegistryBindingDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	result, err := artifactregistrybinding.GetArtifactRegistryBinding(devopsClient, name, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetArtifactRegistryBindingList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := request.PathParameter("namespace")
	result, err := artifactregistrybinding.GetArtifactRegistryBindingList(devopsClient, dataSelect, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
