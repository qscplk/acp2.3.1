package handler

import (
	"errors"
	"net/http"
	"strings"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/deployment"
	"alauda.io/diablo/src/backend/resource/statefulset"

	kdErrors "alauda.io/diablo/src/backend/errors"
	restful "github.com/emicklei/go-restful"
	"github.com/spf13/cast"
	v1 "k8s.io/api/apps/v1"
	client "k8s.io/client-go/kubernetes"
)

func (apiHandler *APIHandler) handleStartStopDeployment(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterDeployment)
	deploy, err := k8sClient.Apps().Deployments(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	var list []v1.Deployment
	list = append(list, *deploy)
	isStop := strings.HasSuffix(request.Request.URL.Path, "stop")
	if !isStop {
		err = startResources(k8sClient, list, nil)
	} else {
		err = stopResources(k8sClient, list, nil)
	}

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	} else {
		response.WriteHeader(http.StatusNoContent)
	}
}

func (apiHandler *APIHandler) handleStartStopStatefulSet(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterStatefulset)
	statefulset, err := k8sClient.Apps().StatefulSets(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	list := make([]v1.StatefulSet, 0)
	list = append(list, *statefulset)
	isStop := strings.HasSuffix(request.Request.URL.Path, "stop")
	if !isStop {
		err = startResources(k8sClient, nil, list)
	} else {
		err = stopResources(k8sClient, nil, list)
	}
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	} else {
		response.WriteHeader(http.StatusNoContent)
	}
}

func (apiHandler *APIHandler) handleStartStopApplication(request *restful.Request, response *restful.Response) {
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

	app, _ := appCoreClient.GetApplication(namespace, name)
	if app == nil {
		err = errors.New("app resource not found")
		kdErrors.HandleInternalError(response, err)
		return
	}

	deployments, err := deployment.GetFormCore(*app)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	statefulSets, err := statefulset.GetFormCore(*app)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	isStop := strings.HasSuffix(request.Request.URL.Path, "stop")
	if !isStop {
		err = startResources(k8sClient, deployments, statefulSets)
	} else {
		err = stopResources(k8sClient, deployments, statefulSets)
	}
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	} else {
		response.WriteHeader(http.StatusNoContent)
	}
}

func startResources(k8sClient client.Interface, deploys []v1.Deployment, statefulsets []v1.StatefulSet) error {
	for _, item := range deploys {
		if *item.Spec.Replicas != 0 {
			return nil
		}

		lastReplicas, ok := item.GetAnnotations()[GetAppKey("last-replicas")]
		if !ok {
			lastReplicas = "1"
		}

		if lastReplicas == "0" {
			lastReplicas = "1"
		}

		num := cast.ToInt32(lastReplicas)
		item.Spec.Replicas = &num
		_, err := k8sClient.Apps().Deployments(item.Namespace).Update(&item)
		if err != nil {
			return err
		}
	}

	for _, item := range statefulsets {
		if *item.Spec.Replicas != 0 {
			return nil
		}

		lastReplicas, ok := item.GetAnnotations()[GetAppKey("last-replicas")]
		if !ok {
			lastReplicas = "1"
		}

		if lastReplicas == "0" {
			lastReplicas = "1"
		}
		num := cast.ToInt32(lastReplicas)
		item.Spec.Replicas = &num
		_, err := k8sClient.Apps().StatefulSets(item.Namespace).Update(&item)
		if err != nil {
			return err
		}
	}
	return nil
}

func stopResources(k8sClient client.Interface, deploys []v1.Deployment, statefulsets []v1.StatefulSet) error {
	for _, item := range deploys {
		if *item.Spec.Replicas == 0 {
			return nil
		}

		lastReplicas := *item.Spec.Replicas
		num := int32(0)
		item.Spec.Replicas = &num
		ano := map[string]string{
			GetAppKey("last-replicas"): cast.ToString(lastReplicas),
		}
		item.SetAnnotations(ano)
		_, err := k8sClient.Apps().Deployments(item.Namespace).Update(&item)
		if err != nil {
			return err
		}
	}

	for _, item := range statefulsets {
		if *item.Spec.Replicas == 0 {
			return nil
		}

		lastReplicas := *item.Spec.Replicas
		num := int32(0)
		item.Spec.Replicas = &num
		ano := map[string]string{
			GetAppKey("last-replicas"): cast.ToString(lastReplicas),
		}
		item.SetAnnotations(ano)
		_, err := k8sClient.Apps().StatefulSets(item.Namespace).Update(&item)
		if err != nil {
			return err
		}
	}
	return nil
}
