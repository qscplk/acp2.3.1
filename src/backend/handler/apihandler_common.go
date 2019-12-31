package handler

import (
	"alauda.io/diablo/src/backend/resource/commonresource"
	"alauda.io/diablo/src/backend/resource/commonsubresource"
	"log"
	"net/http"

	kdErrors "alauda.io/diablo/src/backend/errors"
	"github.com/emicklei/go-restful"
)

func (apiHandler *APIHandler) handleGetCommonResource(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resource := request.PathParameter("resource")
	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}

	result, err := commonresource.GetResource(devopsClient, namespace, resource, name, parameters)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCommonResourceList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resource := request.PathParameter("resource")

	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}

	result, err := commonresource.GetResourceList(devopsClient, namespace, resource, parameters)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteCommonResource(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resource := request.PathParameter("resource")
	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}

	_, err = commonresource.DeleteResource(devopsClient, namespace, resource, name, parameters)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handlePostCommonResource(request *restful.Request, response *restful.Response) {
	logName := "handlePostCommonResource"

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := request.Request.Body

	log.Printf("%s spec is %#v", logName, spec)

	resource := request.PathParameter("resource")

	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}

	result, err := commonresource.PostResource(devopsClient, namespace, resource, parameters, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handlePutCommonResource(request *restful.Request, response *restful.Response) {
	logName := "handlePostCommonResource"

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := request.Request.Body

	log.Printf("%s spec is %#v", logName, spec)

	resource := request.PathParameter("resource")
	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}

	result, err := commonresource.PutResource(devopsClient, namespace, resource, name, parameters, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handlePostCommonResourceSub(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	body := request.Request.Body

	resource := request.PathParameter("resource")
	name := request.PathParameter("name")
	sub := request.PathParameter("sub")
	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}

	result, err := commonsubresource.PostResourceSub(devopsClient, namespace, resource, name, sub, parameters, body)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleGetCommonResourceSub(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resource := request.PathParameter("resource")
	name := request.PathParameter("name")
	sub := request.PathParameter("sub")
	namespace := request.PathParameter("namespace")
	query := request.Request.URL.Query()
	parameters := make(map[string]string)
	for k, v := range query {
		parameters[k] = v[0]
	}
	result, err := commonsubresource.GetResourceSub(devopsClient, namespace, resource, name, sub, parameters)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
