package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"alauda.io/diablo/src/backend/resource/statistics"
	"github.com/emicklei/go-restful"
	"github.com/golang/glog"

	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/clusterpipelinetemplate"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/configmap"
	"alauda.io/diablo/src/backend/resource/jenkinsbinding"
	"alauda.io/diablo/src/backend/resource/pipeline"
	"alauda.io/diablo/src/backend/resource/pipelineconfig"
	"alauda.io/diablo/src/backend/resource/pipelinetasktemplate"
	"alauda.io/diablo/src/backend/resource/pipelinetemplate"
	"alauda.io/diablo/src/backend/resource/pipelinetemplatesync"
	"alauda.io/diablo/src/backend/resource/projectmanagement"
	"alauda.io/diablo/src/backend/resource/projectmanagementbinding"
	"alauda.io/diablo/src/backend/resource/secret"
	"alauda.io/diablo/src/backend/resource/testtool"
	"alauda.io/diablo/src/backend/resource/testtoolbinding"
	"alauda.io/diablo/src/backend/resource/toolchain"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
)

const (
	// PATH_NAMESPACE const for restful path variable namespace
	PATH_NAMESPACE string = "namespace"
	// PATH_NAME const for restful path variable name
	PATH_NAME string = "name"
)

// configuration
func (apiHandler *APIHandler) handleGetPlatformConfiguration(request *restful.Request, response *restful.Response) {
	// k8sClient, err := apiHandler.cManager.Client(request)
	// forcing to get the configuration
	// instead of using user permission
	insecurek8sClient := apiHandler.cManager.InsecureClient()

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := "alauda-system"
	name := "global-configmap"
	// dataSelect := parseDataSelectPathParameter(request)
	// dataSelect.MetricQuery = dataselect.StandardMetrics
	result, err, _ := configmap.GetConfigMapDetail(insecurek8sClient, appCoreClient, namespace, name)
	// result, err := resourceService.GetServicePods(k8sClient, apiHandler.iManager.Metric().Client(), namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// region PipelineTemplateSync

func (apiHandler *APIHandler) handleGetPipelineTemplateSyncList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := pipelinetemplatesync.GetPipelineTemplateSyncList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPipelineTemplateSync(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := pipelinetemplatesync.GetPipelineTemplateSync(devopsClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreatePipelineTemplateSync(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(pipelinetemplatesync.PipelineTemplateSync)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec.ObjectMeta.Name = "TemplateSync"
	namespace := request.PathParameter("namespace")
	result, err := pipelinetemplatesync.CreatePipelineTemplateSync(devopsClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdatePipelineTemplateSync(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(pipelinetemplatesync.PipelineTemplateSync)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := pipelinetemplatesync.UpdatePipelineTemplateSync(devopsClient, namespace, name, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeletePipelineTemplateSync(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = pipelinetemplatesync.DeletePipelineTemplateSync(devopsClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

// endregion

// region PipelineTaskTemplate

func (apiHandler *APIHandler) handleGetPipelineTaskTemplateList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PATH_NAMESPACE)
	result, err := pipelinetasktemplate.GetPipelineTaskTemplateList(devopsClient, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPipelineTaskTemplate(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PATH_NAMESPACE)
	name := request.PathParameter(PATH_NAME)
	result, err := pipelinetasktemplate.GetPipelineTaskTemplate(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

// region PipelineTemplate

func (apiHandler *APIHandler) handleGetPipelineTemplateList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PATH_NAMESPACE)
	dataselect := parseDataSelectPathParameter(request)
	result, err := pipelinetemplate.GetPipelineTemplateList(devopsClient, namespace, dataselect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPipelineTemplate(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PATH_NAMESPACE)
	name := request.PathParameter(PATH_NAME)
	result, err := pipelinetemplate.GetPipelineTemplate(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePreviewPipelineTemplate(request *restful.Request, response *restful.Response) {
	options := new(pipelinetemplate.PreviewOptions)
	if err := request.ReadEntity(options); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	result, err := pipelinetemplate.RenderJenkinsfile(devopsClient, namespace, name, options)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlerExportsPiplineTemplate(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	taskName := request.PathParameter("taskName")
	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")

	result, err := pipelinetemplate.GetPipelineTempalteExports(devopsClient, namespace, name, taskName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePipelinetemplatecategories(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	categories := pipelinetemplate.PipelineTemplateCategoryList{
		Items: []pipelinetemplate.PipelineTemplateCategory{},
	}
	result := pipelinetemplate.GetCategories(devopsClient, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	} else {
		for _, category := range result {
			categories.Items = append(categories.Items, category)
		}
	}

	response.WriteHeaderAndEntity(http.StatusOK, categories)
}

// endregion

// region ClusterPipelineConfig
func (apiHandler *APIHandler) handleGetClusterPipelineTemplateList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	dataselect := parseDataSelectPathParameter(request)
	result, err := clusterpipelinetemplate.GetClusterPipelineTemplateList(devopsClient, namespace, dataselect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetClusterPipelineTemplate(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	result, err := clusterpipelinetemplate.GetClusterPipelineTemplate(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlerExportsClusterPiplineTemplate(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	taskName := request.QueryParameter("taskName")
	name := request.PathParameter("name")

	result, err := clusterpipelinetemplate.GetClusterPipelineTempalteExports(devopsClient, name, taskName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePreviewClusterPipelineTemplate(request *restful.Request, response *restful.Response) {
	options := new(clusterpipelinetemplate.PreviewOptions)
	if err := request.ReadEntity(options); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := clusterpipelinetemplate.RenderJenkinsfile(devopsClient, name, options)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

// region PipelineConfig

func (apiHandler *APIHandler) handleGetPipelineConfigList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := pipelineconfig.GetPipelineConfigList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreatePipelineConfig(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(pipelineconfig.PipelineConfigDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if spec.Spec.Strategy.Template != nil {
		log.Printf("kind:%s", spec.Spec.Strategy.Template.Kind)
	}
	result, err := pipelineconfig.CreatePipelineConfigDetail(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPipelineConfigDetail(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := pipelineconfig.GetPipelineConfigDetail(devopsClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdatePipelineConfig(request *restful.Request, response *restful.Response) {
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

	spec := new(pipelineconfig.PipelineConfigDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := pipelineconfig.UpdatePipelineConfigDetail(devopsClient, k8sClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeletePipelineConfig(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = pipelineconfig.DeletePipelineConfig(devopsClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleTriggerPipelineConfig(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	spec := new(pipelineconfig.PipelineConfigTrigger)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	spec.Namespace = namespace
	spec.Name = name
	result, err := pipelineconfig.TriggerPipelineConfig(devopsClient, k8sClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCronCheck(request *restful.Request, response *restful.Response) {
	cron := request.QueryParameter("cron")
	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	opt := &v1alpha1.JenkinsBindingProxyOptions{
		URL: "alauda/cronTabCheck?cronText=" + url.QueryEscape(cron),
	}

	result, err := devopsClient.DevopsV1alpha1().JenkinsBindings(namespace).Proxy(name, opt)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	checkResult := jenkinsbinding.APIResponse{}
	if result.Code == 200 && result.Data != "" {
		err := json.Unmarshal([]byte(result.Data), &checkResult)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
	} else {
		log.Printf("cron text error, result %v\n", result)
	}

	response.WriteHeaderAndEntity(http.StatusOK, checkResult.Data)
}

func (apiHandler *APIHandler) handlePreviewPipelineConfig(request *restful.Request, response *restful.Response) {
	spec := new(pipelineconfig.PipelineConfigDetail)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")

	result, err := pipelineconfig.RenderJenkinsfile(devopsClient, namespace, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleScanPipelineConfig(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	log.Println("namespace", namespace)
	err = pipelineconfig.ScanMultiBranch(devopsClient, namespace, name)
	if err != nil {
		log.Println("got error from here")
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeader(http.StatusOK)
}

func (apiHandler *APIHandler) handlePipelineConfigLogs(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	start, err := strconv.Atoi(request.QueryParameter("start"))
	if err != nil {
		log.Println("Error parsing start query parameter: original ", request.QueryParameter("start"), "err:", err)
		start = 0
	}

	result, err := pipelineconfig.GetLogDetails(devopsClient, namespace, name, start)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

// region Pipeline

func (apiHandler *APIHandler) handleGetPipelineList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := pipeline.GetPipelineList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetPipelineDetail(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := pipeline.GetPipelineDetail(devopsClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	withFreshStagesStr := request.QueryParameter("withFreshStages")
	if withFreshStages, err := strconv.ParseBool(withFreshStagesStr); err == nil && withFreshStages {
		if taskDetails, err := pipeline.GetTaskDetails(devopsClient, namespace, name, 0); err == nil {
			if stages, err := json.Marshal(taskDetails); err == nil {
				result.Status.Jenkins.Stages = string(stages)
			}
		}
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeletePipeline(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = pipeline.DeletePipeline(devopsClient, k8sClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleRetryPipelineDetail(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	spec := new(pipeline.RetryRequest)
	// if err := request.ReadEntity(spec); err != nil {
	// 	log.Println("error reading body", err)
	// 	kdErrors.HandleInternalError(response, err)
	// 	return
	// }
	spec.Namespace = namespace
	spec.Name = name
	result, err := pipeline.RetryPipeline(devopsClient, k8sClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleAbortPipeline(request *restful.Request, response *restful.Response) {
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

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	spec := pipeline.AbortRequest{
		Namespace: namespace,
		Name:      name,
	}
	result, err := pipeline.AbortPipeline(devopsClient, k8sClient, &spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePipelineLogs(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	start, err := strconv.Atoi(request.QueryParameter("start"))
	if err != nil {
		log.Println("Error parsing start query parameter: original ", request.QueryParameter("start"), "err:", err)
		start = 0
	}
	stage, err := strconv.Atoi(request.QueryParameter("stage"))
	if err != nil {
		log.Println("Error parsing stage query parameter: original ", request.QueryParameter("stage"), "err:", err)
		stage = 0
	}
	step, err := strconv.Atoi(request.QueryParameter("step"))
	if err != nil {
		log.Println("Error parsing step query parameter: original ", request.QueryParameter("step"), "err:", err)
		step = 0
	}

	result, err := pipeline.GetLogDetails(devopsClient, namespace, name, start, stage, step)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePipelineTasks(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	stage, err := strconv.Atoi(request.QueryParameter("stage"))
	if err != nil {
		stage = 0
	}

	result, err := pipeline.GetTaskDetails(devopsClient, namespace, name, stage)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

func (apiHandler *APIHandler) handlePipelineInput(request *restful.Request, response *restful.Response) {
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
	opt := new(pipeline.InputOptions)
	if err := request.ReadEntity(opt); err != nil {
		log.Println("error reading body when handlePipelineInput", err)
		kdErrors.HandleInternalError(response, err)
		return
	}

	opt.Name = request.PathParameter("name")
	opt.Namespace = request.PathParameter("namespace")
	result, err := pipeline.InputHandle(devopsClient, k8sClient, opt)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handlePipelineTestReports(request *restful.Request, response *restful.Response) {
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

	opt := &pipeline.PipelineTestReportsOptions{}
	start, err := strconv.Atoi(request.QueryParameter("start"))
	if err != nil {
		log.Println("Error parsing start query parameter: original ", request.QueryParameter("start"), "err:", err)
		start = 0
	}
	limit, err := strconv.Atoi(request.QueryParameter("limit"))
	if err != nil {
		log.Println("Error parsing stage query parameter: original ", request.QueryParameter("limit"), "err:", err)
		limit = 100
	}
	opt.Start = start
	opt.Limit = limit
	opt.Name = request.PathParameter("name")
	opt.Namespace = request.PathParameter("namespace")
	fmt.Printf("test report opt %#v", opt)
	result, err := pipeline.HandlePipelineTestReport(devopsClient, k8sClient, opt)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// region ToolChain
func (apiHandler *APIHandler) handleGetToolChains(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	k8sClient := apiHandler.cManager.InsecureClient()

	toolType := request.QueryParameter("tool_type")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := toolchain.GetToolChainList(devopsClient, k8sClient, dataSelect, toolType)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetToolChainBindings(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	k8sClient := apiHandler.cManager.InsecureClient()

	toolType := request.QueryParameter("tool_type")
	namespace := request.PathParameter("namespace")
	namespaceQuery := common.NewSameNamespaceQuery(namespace)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := toolchain.GetToolChainBindingList(devopsClient, k8sClient, dataSelect, namespaceQuery, toolType)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

func (apiHandler *APIHandler) handleOAuthCallback(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	k8sClient := apiHandler.cManager.InsecureClient()

	namespace := request.PathParameter("namespace")
	secretNamespace := request.PathParameter("secretNamespace")
	secretName := request.PathParameter("secretName")
	serviceName := request.PathParameter("serviceName")
	code := request.QueryParameter("code")

	// addition message from bitbucket
	errorDescription := request.QueryParameter("error_description")
	if code != "" {
		err = secret.OAuthCallback(devopsClient, k8sClient, namespace, secretNamespace, secretName, serviceName, code)
	} else if errorDescription != "" {
		err = errors.New(errorDescription)
	} else {
		err = errors.New("except 'code' from third party, but not")
	}

	if err != nil {
		glog.Error(err)
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, nil)
}

// region ProjectManagement

func (apiHandler *APIHandler) handleCreateProjectManagement(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.ProjectManagement)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := projectmanagement.CreateProjectManagement(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteProjectManagement(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	err = projectmanagement.DeleteProjectManagement(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateProjectManagement(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	spec := new(v1alpha1.ProjectManagement)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := projectmanagement.UpdateProjectManagement(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetProjectManagementDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := projectmanagement.GetProjectManagement(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetProjectManagementList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := projectmanagement.GetProjectManagementList(devopsClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateProjectManagementBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.ProjectManagementBinding)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	result, err := projectmanagementbinding.CreateProjectManagementBinding(devopsClient, spec, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteProjectManagementBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = projectmanagementbinding.DeleteProjectManagementBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateProjectManagementBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	spec := new(v1alpha1.ProjectManagementBinding)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := projectmanagementbinding.UpdateProjectManagementBinding(devopsClient, spec, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetProjectManagementBindingDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := projectmanagementbinding.GetProjectManagementBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetProjectManagementBindingList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := projectmanagementbinding.GetProjectManagementBindingList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

// region TestTool

func (apiHandler *APIHandler) handleCreateTestTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.TestTool)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := testtool.CreateTestTool(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteTestTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	err = testtool.DeleteTestTool(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateTestTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	spec := new(v1alpha1.TestTool)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := testtool.UpdateTestTool(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetTestToolDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := testtool.GetTestTool(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetTestToolList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := testtool.GetTestToolList(devopsClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateTestToolBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.TestToolBinding)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	result, err := testtoolbinding.CreateTestToolBinding(devopsClient, spec, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteTestToolBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = testtoolbinding.DeleteTestToolBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateTestToolBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	spec := new(v1alpha1.TestToolBinding)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := testtoolbinding.UpdateTestToolBinding(devopsClient, spec, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetTestToolBindingDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := testtoolbinding.GetTestToolBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetTestToolBindingList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := testtoolbinding.GetTestToolBindingList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion

func (apiHandler *APIHandler) handleGetPipelineStatistics(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	period := request.QueryParameter("period")
	startTime, endTime, err := GetRecentPeriodTime(period)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := statistics.GetPipelineStatistics(devopsClient, namespace, dataSelect, startTime, endTime)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetStageStatistics(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	period := request.QueryParameter("period")
	startTime, endTime, err := GetRecentPeriodTime(period)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := statistics.GetStageStatistics(devopsClient, namespace, dataSelect, startTime, endTime)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeQualityStatistics(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)

	result, err := statistics.GetCodeQualityStatistics(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}
