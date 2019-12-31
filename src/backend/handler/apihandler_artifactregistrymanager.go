package handler

import (
	"alauda.io/diablo/src/backend/resource/artifactregistrymanager"
	"net/http"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"github.com/emicklei/go-restful"
)

func (apiHandler *APIHandler) handleCreateArtifactRegistryManager(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.ArtifactRegistryManager)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := artifactregistrymanager.CreateArtifactRegistryManager(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteArtifactRegistryManager(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	err = artifactregistrymanager.DeleteArtifactRegistryManager(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateArtifactRegistryManager(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	spec := new(v1alpha1.ArtifactRegistryManager)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := artifactregistrymanager.UpdateArtifactRegistryManager(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetArtifactRegistryManagerDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := artifactregistrymanager.GetArtifactRegistryManager(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetArtifactRegistryManagerBlobstore(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := artifactregistrymanager.GetArtifactRegistryManagerBlobstore(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetArtifactRegistryManagerList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := artifactregistrymanager.GetArtifactRegistryManagerList(devopsClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
