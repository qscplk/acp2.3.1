package handler

import (
	"alauda.io/diablo/src/backend/resource/application"
	"github.com/emicklei/go-restful"
	"net/http"
)

func AddAppCoreUrl(apiV1Ws *restful.WebService, apiHandler APIHandler) {
	// region Applications
	apiV1Ws.Route(
		apiV1Ws.GET("/applications/{namespace}").
			To(apiHandler.handleGetApplicationsList).
			Writes(application.ApplicationList{}).
			Doc("get namespaced application list"))
	apiV1Ws.Route(
		apiV1Ws.POST("/applications/{namespace}").
			To(apiHandler.handleCreateApplication).
			Writes(application.ApplicationDetail{}).
			Doc("create application"))
	apiV1Ws.Route(
		apiV1Ws.PUT("/applications/{namespace}/{name}").
			To(apiHandler.handleUpdateApplication).
			Writes(application.ApplicationDetail{}).
			Doc("update application details").
			Returns(200, "OK", application.ApplicationDetail{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/applications/{namespace}/{name}").
			To(apiHandler.handleGetApplicationDetail).
			Writes(application.ApplicationDetail{}).
			Doc("get application details").
			Returns(200, "OK", application.ApplicationDetail{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/applications/{namespace}/{name}/start").
			To(apiHandler.handleStartStopApplication).
			Doc("start application").
			Returns(http.StatusNoContent, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/applications/{namespace}/{name}/stop").
			To(apiHandler.handleStartStopApplication).
			Doc("stop application").
			Returns(http.StatusNoContent, "OK", struct{}{}))
	// this is not just a delete, we will post a body, the resource what in the body will just remove the label
	// then the resource will not belong the any app any more
	apiV1Ws.Route(
		apiV1Ws.POST("/applications/{namespace}/{name}/actions/delete").
			To(apiHandler.handleDeleteApplication).
			Writes(application.DeleteAppYAMLSpec{}).
			Doc("deletes application with all related resources").
			Returns(200, "OK", application.UpdateAppYAMLSpec{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/applications/{namespace}/{name}/yaml").
			To(apiHandler.handleGetApplicationYAML).
			Writes(application.ApplicationDetail{}).
			Doc("get application details").
			Returns(200, "OK", application.ApplicationYAML{}))

	apiV1Ws.Route(
		apiV1Ws.PUT("/applications/{namespace}/{name}/yaml").
			To(apiHandler.handleUpdateApplicationYAML).
			Writes(application.UpdateAppYAMLSpec{}).
			Doc("update application details").
			Returns(200, "OK", application.UpdateAppYAMLSpec{}))
	// endregion

}
