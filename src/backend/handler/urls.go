package handler

import (
	"alauda.io/diablo/src/backend/resource/artifactregistry"
	"alauda.io/diablo/src/backend/resource/artifactregistrybinding"
	"alauda.io/diablo/src/backend/resource/artifactregistrymanager"
	"alauda.io/diablo/src/backend/resource/codequalitybinding"
	"alauda.io/diablo/src/backend/resource/codequalityproject"
	"k8s.io/api/core/v1"

	"net/http"

	resourceService "alauda.io/diablo/src/backend/resource/service"
	"alauda.io/diablo/src/backend/resource/servicegraph"

	catalog "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	clientapi "alauda.io/diablo/src/backend/client/api"

	asfClient "alauda.io/diablo/src/backend/client/asf"
	"alauda.io/diablo/src/backend/integration"
	"alauda.io/diablo/src/backend/resource/clusterpipelinetemplate"
	"alauda.io/diablo/src/backend/resource/codequalitytool"
	"alauda.io/diablo/src/backend/resource/coderepobinding"
	"alauda.io/diablo/src/backend/resource/codereposervice"
	"alauda.io/diablo/src/backend/resource/coderepository"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/configmap"
	"alauda.io/diablo/src/backend/resource/deployment"
	"alauda.io/diablo/src/backend/resource/domain"
	"alauda.io/diablo/src/backend/resource/domainbinding"
	"alauda.io/diablo/src/backend/resource/horizontalpodautoscaler"
	"alauda.io/diablo/src/backend/resource/imageregistry"
	"alauda.io/diablo/src/backend/resource/imageregistrybinding"
	"alauda.io/diablo/src/backend/resource/imagerepository"
	"alauda.io/diablo/src/backend/resource/jenkins"
	"alauda.io/diablo/src/backend/resource/jenkinsbinding"
	"alauda.io/diablo/src/backend/resource/logs"
	"alauda.io/diablo/src/backend/resource/microservicesapplication"
	"alauda.io/diablo/src/backend/resource/microservicesconfiguration"
	"alauda.io/diablo/src/backend/resource/microservicesenvironment"
	ns "alauda.io/diablo/src/backend/resource/namespace"
	"alauda.io/diablo/src/backend/resource/other"
	"alauda.io/diablo/src/backend/resource/persistentvolumeclaim"
	"alauda.io/diablo/src/backend/resource/pipeline"
	"alauda.io/diablo/src/backend/resource/pipelineconfig"
	"alauda.io/diablo/src/backend/resource/pipelinetasktemplate"
	"alauda.io/diablo/src/backend/resource/pipelinetemplate"
	"alauda.io/diablo/src/backend/resource/pipelinetemplatesync"
	"alauda.io/diablo/src/backend/resource/pod"
	"alauda.io/diablo/src/backend/resource/projectmanagement"
	"alauda.io/diablo/src/backend/resource/projectmanagementbinding"
	"alauda.io/diablo/src/backend/resource/rbacrolebindings"
	"alauda.io/diablo/src/backend/resource/rbacroles"
	"alauda.io/diablo/src/backend/resource/release"
	"alauda.io/diablo/src/backend/resource/replicaset"
	"alauda.io/diablo/src/backend/resource/rolebinding"
	"alauda.io/diablo/src/backend/resource/secret"
	"alauda.io/diablo/src/backend/resource/storageclass"
	"alauda.io/diablo/src/backend/resource/testtool"
	"alauda.io/diablo/src/backend/resource/testtoolbinding"
	"alauda.io/diablo/src/backend/resource/toolchain"
	"alauda.io/diablo/src/backend/settings"
	"alauda.io/diablo/src/backend/systembanner"
	"alauda.io/diablo/src/backend/thirdparty"
	thirdpartyapi "alauda.io/diablo/src/backend/thirdparty/api"
	thandler "bitbucket.org/mathildetech/themex/handler"
	"github.com/emicklei/go-restful"
	appsv1 "k8s.io/api/apps/v1"
	authv1 "k8s.io/api/authorization/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// TerminalResponse is sent by handleExecShell. The Id is a random session id that binds the original REST request and the SockJS connection.
// Any clientapi in possession of this Id can hijack the terminal session.
type TerminalResponse struct {
	Id string `json:"id"`
}

// CreateHTTPAPIHandler creates a new HTTP handler that handles all requests to the API of the backend.
func CreateHTTPAPIHandler(iManager integration.IntegrationManager, cManager clientapi.DevOpsClientManager,
	sManager settings.SettingsManager,
	sbManager systembanner.SystemBannerManager,
	tpManager thirdpartyapi.ThirdPartyManager) (http.Handler, error) {

	mw := NewLicenseMiddlewareFactory(false)
	apiHandler := APIHandler{iManager: iManager, cManager: cManager, sManager: &sManager, groupValidator: mw}
	wsContainer := restful.NewContainer()
	wsContainer.EnableContentEncoding(true)

	apiV1Ws := new(restful.WebService)

	InstallFilters(apiV1Ws, cManager, mw)

	apiV1Ws.Path("/api/v1").
		Consumes(restful.MIME_JSON).
		Produces(restful.MIME_JSON).
		Param(restful.HeaderParameter("Authorization", "Given Bearer token will use this as authorization for the API"))

	wsContainer.Add(apiV1Ws)

	apiV2Ws := new(restful.WebService)
	apiV2Ws.Path("").
		Consumes(restful.MIME_JSON).
		Produces(restful.MIME_JSON).
		Param(restful.HeaderParameter("Authorization", "Given Bearer token will use this as authorization for the API"))
	wsContainer.Add(apiV2Ws)

	integrationHandler := integration.NewIntegrationHandler(iManager)
	integrationHandler.Install(apiV1Ws)
	integrationHandler.Install(apiV2Ws)

	settingsHandler := settings.NewSettingsHandler(sManager)
	settingsHandler.Install(apiV1Ws)
	settingsHandler.Install(apiV2Ws)

	systemBannerHandler := systembanner.NewSystemBannerHandler(sbManager)
	systemBannerHandler.Install(apiV1Ws)
	systemBannerHandler.Install(apiV2Ws)

	thirPartyHandler := thirdparty.NewThirdPartyHandler(&sManager, cManager, tpManager)
	thirPartyHandler.Install(apiV1Ws)
	thirPartyHandler.Install(apiV2Ws)

	configurationHandler := thandler.NewAPIHandler("configuration")
	configurationHandler.Install(apiV1Ws)
	configurationHandler.Install(apiV2Ws)

	apiV1Ws.Route(
		apiV1Ws.GET("/namespaces").
			To(apiHandler.handleGetNamespaces).
			Writes(ns.NamespaceList{}).
			Doc("get namespaces list").
			Returns(200, "OK", ns.NamespaceList{}))

	apiV2Ws.Route(
		apiV2Ws.GET("/apis/v1/projects/{name}/clusters/{cluster}/namespaces").
			To(apiHandler.handleNewGetNamespaces).
			Writes(v1.NamespaceList{}).
			Doc("new get project list").
			Returns(200, "OK", v1.NamespaceList{}))

	apiV2Ws.Route(
		apiV2Ws.GET("/project/v1/projects/{name}/clusters/{cluster}/namespaces").
			To(apiHandler.handleNewGetNamespaces).
			Writes(v1.NamespaceList{}).
			Doc("new get project list").
			Returns(200, "OK", v1.NamespaceList{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/appdeployment").
			To(apiHandler.handleDeploy).
			Reads(deployment.AppDeploymentSpec{}).
			Writes(deployment.AppDeploymentSpec{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/configuration").
			To(apiHandler.handleGetPlatformConfiguration).
			Writes(configmap.ConfigMapDetail{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/cani").
			To(apiHandler.handleCanI).
			Reads(authv1.SelfSubjectAccessReviewSpec{}).
			Writes(common.CanIResponse{}).
			Doc("Validates access for user").
			Returns(200, "OK", common.CanIResponse{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/caniadmin").
			To(apiHandler.handleCanIAdmin).
			Writes(common.CanIResponse{}).
			Doc("Validates access for admin user").
			Returns(200, "OK", common.CanIResponse{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/apis").
			To(apiHandler.handleGetAPIGroups).
			Writes(metav1.APIGroupList{}).
			Doc("Fetches a list of API groups available").
			Returns(200, "OK", metav1.APIGroupList{}))

	//apiV1Ws.Route(
	//	apiV1Ws.POST("/appdeployment/validate/name").
	//		To(apiHandler.handleNameValidity).
	//		Reads(validation.AppNameAppNameValiditySpecValiditySpec{}).
	//		Writes(validation.AppNameValidity{}))
	//apiV1Ws.Route(
	//	apiV1Ws.POST("/appdeployment/validate/imagereference").
	//		To(apiHandler.handleImageReferenceValidity).
	//		Reads(validation.ImageReferenceValiditySpec{}).
	//		Writes(validation.ImageReferenceValidity{}))
	//apiV1Ws.Route(
	//	apiV1Ws.POST("/appdeployment/validate/protocol").
	//		To(apiHandler.handleProtocolValidity).
	//		Reads(validation.ProtocolValiditySpec{}).
	//		Writes(validation.ProtocolValidity{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/appdeployment/protocols").
	//		To(apiHandler.handleGetAvailableProcotols).
	//		Writes(deployment.Protocols{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.POST("/appdeploymentfromfile").
	//		To(apiHandler.handleDeployFromFile).
	//		Reads(deployment.AppDeploymentFromFileSpec{}).
	//		Writes(deployment.AppDeploymentFromFileResponse{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicationcontroller").
	//		To(apiHandler.handleGetReplicationControllerList).
	//		Writes(replicationcontroller.ReplicationControllerList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicationcontroller/{namespace}").
	//		To(apiHandler.handleGetReplicationControllerList).
	//		Writes(replicationcontroller.ReplicationControllerList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicationcontroller/{namespace}/{replicationController}").
	//		To(apiHandler.handleGetReplicationControllerDetail).
	//		Writes(replicationcontroller.ReplicationControllerDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.POST("/replicationcontroller/{namespace}/{replicationController}/update/pod").
	//		To(apiHandler.handleUpdateReplicasCount).
	//		Reads(replicationcontroller.ReplicationControllerSpec{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicationcontroller/{namespace}/{replicationController}/pod").
	//		To(apiHandler.handleGetReplicationControllerPods).
	//		Writes(pod.PodList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicationcontroller/{namespace}/{replicationController}/event").
	//		To(apiHandler.handleGetReplicationControllerEvents).
	//		Writes(common.EventList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicationcontroller/{namespace}/{replicationController}/service").
	//		To(apiHandler.handleGetReplicationControllerServices).
	//		Writes(resourceService.ServiceList{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/workload").
	//		To(apiHandler.handleGetWorkloads).
	//		Writes(workload.Workloads{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/workload/{namespace}").
	//		To(apiHandler.handleGetWorkloads).
	//		Writes(workload.Workloads{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/cluster").
	//		To(apiHandler.handleGetCluster).
	//		Writes(cluster.Cluster{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/discovery").
	//		To(apiHandler.handleGetDiscovery).
	//		Writes(discovery.Discovery{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/discovery/{namespace}").
	//		To(apiHandler.handleGetDiscovery).
	//		Writes(discovery.Discovery{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/config").
	//		To(apiHandler.handleGetConfig).
	//		Writes(config.Config{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/config/{namespace}").
	//		To(apiHandler.handleGetConfig).
	//		Writes(config.Config{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicaset").
	//		To(apiHandler.handleGetReplicaSets).
	//		Writes(replicaset.ReplicaSetList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicaset/{namespace}").
	//		To(apiHandler.handleGetReplicaSets).
	//		Writes(replicaset.ReplicaSetList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicaset/{namespace}/{replicaSet}").
	//		To(apiHandler.handleGetReplicaSetDetail).
	//		Writes(replicaset.ReplicaSetDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicaset/{namespace}/{replicaSet}/pod").
	//		To(apiHandler.handleGetReplicaSetPods).
	//		Writes(pod.PodList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/replicaset/{namespace}/{replicaSet}/event").
	//		To(apiHandler.handleGetReplicaSetEvents).
	//		Writes(common.EventList{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/pod").
	//		To(apiHandler.handleGetPods).
	//		Writes(pod.PodList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/pod/{namespace}").
	//		To(apiHandler.handleGetPods).
	//		Writes(pod.PodList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/pod/{namespace}/{pod}").
	//		To(apiHandler.handleGetPodDetail).
	//		Writes(pod.PodDetail{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/pod/{namespace}/{pod}/container").
			To(apiHandler.handleGetPodContainers).
			Writes(pod.PodDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/pod/{namespace}/{pod}/event").
	//		To(apiHandler.handleGetPodEvents).
	//		Writes(common.EventList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/pod/{namespace}/{pod}/shell/{container}").
			To(apiHandler.handleExecShell).
			Writes(TerminalResponse{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/pod/{namespace}/{pod}/persistentvolumeclaim").
	//		To(apiHandler.handleGetPodPersistentVolumeClaims).
	//		Writes(persistentvolumeclaim.PersistentVolumeClaimList{}))
	//

	// region Deployment
	apiV1Ws.Route(
		apiV1Ws.GET("/deployment").
			To(apiHandler.handleGetDeployments).
			Writes(deployment.DeploymentList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/deployment/{namespace}").
			To(apiHandler.handleGetDeployments).
			Writes(deployment.DeploymentList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/deployment/{namespace}/{deployment}").
			To(apiHandler.handleGetDeploymentDetail).
			Writes(deployment.DeploymentDetail{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}").
			To(apiHandler.handleUpdateDeploymentDetail).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/start").
			To(apiHandler.handleStartStopDeployment).
			Doc("start deployment").
			Returns(http.StatusNoContent, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/stop").
			To(apiHandler.handleStartStopDeployment).
			Doc("stop deployment").
			Returns(http.StatusNoContent, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/yaml").
			To(apiHandler.handleUpdateDeploymentDetailYaml).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/replicas").
			To(apiHandler.handleUpdateDeploymentReplicas).
			Writes(deployment.DeploymentReplica{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/network").
			To(apiHandler.handleUpdateDeploymentNetwork).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/container/{container}/").
			To(apiHandler.handlePutDeploymentContainer).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/container/{container}/image").
			To(apiHandler.handleUpdateDeploymentContainerImage).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/container/{container}/resources").
			To(apiHandler.handleUpdateDeploymentContainerResources).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/deployment/{namespace}/{deployment}/container/{container}/env").
			To(apiHandler.handleUpdateDeploymentContainerEnv).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/deployment/{namespace}/{deployment}/container/{container}/volumeMount/").
			To(apiHandler.handleCreateDeploymentVolumeMount).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/deployment/{namespace}/{deployment}/event").
			To(apiHandler.handleGetDeploymentEvents).
			Writes(common.EventList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/deployment/{namespace}/{deployment}/pods").
			To(apiHandler.handleGetDeploymentPods).
			Writes(pod.PodList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/deployment/{namespace}/{deployment}/oldreplicaset").
			To(apiHandler.handleGetDeploymentOldReplicaSets).
			Writes(replicaset.ReplicaSetList{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/deployment/{namespace}/{deployment}/actions/rollback").
			To(apiHandler.handleRollBackDeploymentToRevision).
			Reads(common.RevisionDetail{}).
			Writes(appsv1.Deployment{}).
			Doc("rollback deployment to special revision").
			Returns(200, "OK", appsv1.Deployment{}))

	// endregion

	// region Scale
	//
	//apiV1Ws.Route(
	//	apiV1Ws.PUT("/scale/{kind}/{namespace}/{name}/").
	//		To(apiHandler.handleScaleResource).
	//		Writes(scaling.ReplicaCounts{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/scale/{kind}/{namespace}/{name}").
	//		To(apiHandler.handleGetReplicaCount).
	//		Writes(scaling.ReplicaCounts{}))
	// endregion

	// region Deamonset

	//apiV1Ws.Route(
	//	apiV1Ws.GET("/daemonset").
	//		To(apiHandler.handleGetDaemonSetList).
	//		Writes(daemonset.DaemonSetList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/daemonset/{namespace}").
	//		To(apiHandler.handleGetDaemonSetList).
	//		Writes(daemonset.DaemonSetList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/daemonset/{namespace}/{daemonset}").
			To(apiHandler.handleGetDaemonSetDetail).
			Writes(appsv1.DaemonSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/daemonset/{namespace}/{daemonset}").
			To(apiHandler.handleUpdateDaemonSetDetail).
			Writes(appsv1.DaemonSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/daemonset/{namespace}/{daemonset}/yaml").
			To(apiHandler.handleUpdateDaemonSetDetail).
			Writes(appsv1.Deployment{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/daemonset/{namespace}/{daemonset}/pods").
			To(apiHandler.handleGetDaemonSetPods).
			Writes(pod.PodList{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/daemonset/{namespace}/{daemonset}/container/{container}/").
			To(apiHandler.handlePutDaemonSetContainer).
			Writes(appsv1.DaemonSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/daemonset/{namespace}/{daemonset}/container/{container}/image").
			To(apiHandler.handleUpdateDaemonSetContainerImage).
			Writes(appsv1.DaemonSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/daemonset/{namespace}/{daemonset}/container/{container}/env").
			To(apiHandler.handleUpdateDaemonSetContainerEnv).
			Writes(appsv1.DaemonSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/daemonset/{namespace}/{daemonset}/container/{container}/resources").
			To(apiHandler.handleUpdateDaemonSetContainerResource).
			Writes(appsv1.DaemonSet{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/daemonset/{namespace}/{daemonset}/container/{container}/volumeMount/").
			To(apiHandler.handleCreateDaemonSetVolumeMount).
			Writes(appsv1.DaemonSet{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/daemonset/{namespace}/{daemonSet}/service").
	//		To(apiHandler.handleGetDaemonSetServices).
	//		Writes(resourceService.ServiceList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/daemonset/{namespace}/{daemonSet}/event").
	//		To(apiHandler.handleGetDaemonSetEvents).
	//		Writes(common.EventList{}))

	// endregion

	apiV1Ws.Route(
		apiV1Ws.GET("/horizontalpodautoscaler").
			To(apiHandler.handleGetHorizontalPodAutoscalerList).
			Writes(horizontalpodautoscaler.HorizontalPodAutoscalerList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/horizontalpodautoscaler/{namespace}").
			To(apiHandler.handleGetHorizontalPodAutoscalerList).
			Writes(horizontalpodautoscaler.HorizontalPodAutoscalerList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/horizontalpodautoscaler/{namespace}/{horizontalpodautoscaler}").
			To(apiHandler.handleGetHorizontalPodAutoscalerDetail).
			Writes(horizontalpodautoscaler.HorizontalPodAutoscalerDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/horizontalpodautoscaler/{namespace}").
			To(apiHandler.handleCreateHorizontalPodAutoscaler).
			Reads(horizontalpodautoscaler.HorizontalPodAutoscalerDetail{}).
			Writes(horizontalpodautoscaler.HorizontalPodAutoscalerDetail{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/horizontalpodautoscaler/{namespace}/{horizontalpodautoscaler}").
			To(apiHandler.handleUpdateHorizontalPodAutoscaler).
			Writes(horizontalpodautoscaler.HorizontalPodAutoscalerDetail{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/horizontalpodautoscaler/{namespace}/{horizontalpodautoscaler}").
			To(apiHandler.handleDeleteHorizontalPodAutoscaler).
			Writes(horizontalpodautoscaler.HorizontalPodAutoscalerDetail{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/job").
	//		To(apiHandler.handleGetJobList).
	//		Writes(job.JobList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/job/{namespace}").
	//		To(apiHandler.handleGetJobList).
	//		Writes(job.JobList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/job/{namespace}/{name}").
	//		To(apiHandler.handleGetJobDetail).
	//		Writes(job.JobDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/job/{namespace}/{name}/pod").
	//		To(apiHandler.handleGetJobPods).
	//		Writes(pod.PodList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/job/{namespace}/{name}/event").
	//		To(apiHandler.handleGetJobEvents).
	//		Writes(common.EventList{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/cronjob").
	//		To(apiHandler.handleGetCronJobList).
	//		Writes(cronjob.CronJobList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/cronjob/{namespace}").
	//		To(apiHandler.handleGetCronJobList).
	//		Writes(cronjob.CronJobList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/cronjob/{namespace}/{name}").
	//		To(apiHandler.handleGetCronJobDetail).
	//		Writes(cronjob.CronJobDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/cronjob/{namespace}/{name}/job").
	//		To(apiHandler.handleGetCronJobJobs).
	//		Writes(job.JobList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/cronjob/{namespace}/{name}/event").
	//		To(apiHandler.handleGetCronJobEvents).
	//		Writes(common.EventList{}))
	//

	// region Namespace

	//apiV1Ws.Route(
	//	apiV1Ws.POST("/namespace").
	//		To(apiHandler.handleCreateNamespace).
	//		Reads(ns.NamespaceSpec{}).
	//		Writes(ns.NamespaceSpec{}))

	//apiV1Ws.Route(
	//	apiV1Ws.GET("/namespace/{name}").
	//		To(apiHandler.handleGetNamespaceDetail).
	//		Writes(ns.NamespaceDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/namespace/{name}/event").
	//		To(apiHandler.handleGetNamespaceEvents).
	//		Writes(common.EventList{}))
	//
	// endregion

	// region Secret
	apiV1Ws.Route(
		apiV1Ws.GET("/secret").
			To(apiHandler.handleGetSecretList).
			Writes(secret.SecretList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/secret/{namespace}").
			To(apiHandler.handleGetSecretList).
			Writes(secret.SecretList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/secret/{namespace}/{name}").
			To(apiHandler.handleGetSecretDetail).
			Writes(secret.SecretDetail{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/secret/{name}/resources").
			To(apiHandler.handleGetSecretRelatedResources).
			Writes(secret.ResourceList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/secret/{namespace}/{name}/resources").
			To(apiHandler.handleGetSecretRelatedResources).
			Writes(secret.ResourceList{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/secret/{name}").
			To(apiHandler.handleUpdateSecret).
			Writes(secret.SecretDetail{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/secret/{namespace}/{name}").
			To(apiHandler.handleUpdateSecret).
			Writes(secret.SecretDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/secret").
			To(apiHandler.handleCreateSecret).
			Reads(secret.SecretDetail{}).
			Writes(secret.Secret{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/secret/{namespace}").
			To(apiHandler.handleCreateSecret).
			Reads(secret.SecretDetail{}).
			Writes(secret.Secret{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/secret/{name}").
			To(apiHandler.handleDeleteSecret).
			Writes(secret.SecretDetail{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/secret/{namespace}/{name}").
			To(apiHandler.handleDeleteSecret).
			Writes(secret.SecretDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/secret/{namespace}/{name}/actions/tradeapp").
			To(apiHandler.handleUpdateSecretBelongApp).
			Reads(common.AppNameDetail{}).
			Writes(secret.SecretDetail{}).
			Doc("update secret belongs app").
			Returns(200, "OK", secret.SecretDetail{}))
	// endregion

	// region Configmap
	apiV1Ws.Route(
		apiV1Ws.GET("/configmap").
			To(apiHandler.handleGetConfigMapList).
			Writes(configmap.ConfigMapList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/configmap/{namespace}").
			To(apiHandler.handleGetConfigMapList).
			Writes(configmap.ConfigMapList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/configmap/{namespace}/{configmap}").
			To(apiHandler.handleGetConfigMapDetail).
			Writes(configmap.ConfigMapDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/configmap/{namespace}").
			To(apiHandler.handleCreateConfigMap).
			Reads(configmap.ConfigMapDetail{}).
			Writes(configmap.ConfigMapDetail{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/configmap/{namespace}/{name}").
			To(apiHandler.handleUpdateConfigMap).
			Writes(configmap.ConfigMapDetail{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/configmap/{namespace}/{name}").
			To(apiHandler.handleDeleteConfigMap).
			Writes(configmap.ConfigMapDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/configmap/{namespace}/{name}/actions/tradeapp").
			To(apiHandler.handleUpdateConfigMapBelongApp).
			Reads(common.AppNameDetail{}).
			Writes(configmap.ConfigMapDetail{}).
			Doc("update configmap belongs app").
			Returns(200, "OK", configmap.ConfigMapDetail{}))
	// endregion

	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/service").
	//		To(apiHandler.handleGetServiceList).
	//		Writes(resourceService.ServiceList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/service/{namespace}").
	//		To(apiHandler.handleGetServiceList).
	//		Writes(resourceService.ServiceList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/service/{namespace}/{service}").
			To(apiHandler.handleGetServiceDetail))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/service/{namespace}/{service}/pod").
	//		To(apiHandler.handleGetServicePods).
	//		Writes(pod.PodList{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/ingress").
	//		To(apiHandler.handleGetIngressList).
	//		Writes(ingress.IngressList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/ingress/{namespace}").
	//		To(apiHandler.handleGetIngressList).
	//		Writes(ingress.IngressList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/ingress/{namespace}/{name}").
	//		To(apiHandler.handleGetIngressDetail).
	//		Writes(ingress.IngressDetail{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/statefulset").
	//		To(apiHandler.handleGetStatefulSetList).
	//		Writes(statefulset.StatefulSetList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/statefulset/{namespace}").
	//		To(apiHandler.handleGetStatefulSetList).
	//		Writes(statefulset.StatefulSetList{}))

	// region Statefulset
	apiV1Ws.Route(
		apiV1Ws.GET("/statefulset/{namespace}/{statefulset}").
			To(apiHandler.handleGetStatefulSetDetail).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}").
			To(apiHandler.handleUpdateStatefulSetDetail).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/start").
			To(apiHandler.handleStartStopStatefulSet).
			Doc("start statefulset").
			Returns(http.StatusNoContent, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/stop").
			To(apiHandler.handleStartStopStatefulSet).
			Doc("stop statefulset").
			Returns(http.StatusNoContent, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/yaml").
			To(apiHandler.handleUpdateStatefulSetDetail).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/replicas").
			To(apiHandler.handleUpdateStatefulSetReplicas).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/statefulset/{namespace}/{statefulset}/pods").
			To(apiHandler.handleGetStatefulSetPods).
			Writes(pod.PodList{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/container/{container}/").
			To(apiHandler.handlePutStatefulSetContainer).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/container/{container}/image").
			To(apiHandler.handleUpdateStatefulSetContainerImage).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/container/{container}/env").
			To(apiHandler.handleUpdateStatefulSetContainerEnv).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/statefulset/{namespace}/{statefulset}/container/{container}/resources").
			To(apiHandler.handleUpdateStatefulSetContainerResource).
			Writes(appsv1.StatefulSet{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/statefulset/{namespace}/{statefulset}/container/{container}/volumeMount/").
			To(apiHandler.handleCreateStatefulSetVolumeMount).
			Writes(appsv1.StatefulSet{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/statefulset/{namespace}/{statefulset}/event").
	//		To(apiHandler.handleGetStatefulSetEvents).
	//		Writes(common.EventList{}))

	// endregion

	//apiV1Ws.Route(
	//	apiV1Ws.GET("/node").
	//		To(apiHandler.handleGetNodeList).
	//		Writes(node.NodeList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/node/{name}").
	//		To(apiHandler.handleGetNodeDetail).
	//		Writes(node.NodeDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/node/{name}/event").
	//		To(apiHandler.handleGetNodeEvents).
	//		Writes(common.EventList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/node/{name}/pod").
	//		To(apiHandler.handleGetNodePods).
	//		Writes(pod.PodList{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.DELETE("/_raw/{kind}/namespace/{namespace}/name/{name}").
	//		To(apiHandler.handleDeleteResource))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/_raw/{kind}/namespace/{namespace}/name/{name}").
	//		To(apiHandler.handleGetResource))
	//apiV1Ws.Route(
	//	apiV1Ws.PUT("/_raw/{kind}/namespace/{namespace}/name/{name}").
	//		To(apiHandler.handlePutResource))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.DELETE("/_raw/{kind}/name/{name}").
	//		To(apiHandler.handleDeleteResource))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/_raw/{kind}/name/{name}").
	//		To(apiHandler.handleGetResource))
	//apiV1Ws.Route(
	//	apiV1Ws.PUT("/_raw/{kind}/name/{name}").
	//		To(apiHandler.handlePutResource))
	//

	// region RBAC
	apiV1Ws.Route(
		apiV1Ws.GET("/rbac/role").
			To(apiHandler.handleGetRbacRoleList).
			Writes(rbacroles.RbacRoleList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/rbac/rolebinding").
			To(apiHandler.handleGetRbacRoleBindingList).
			Writes(rbacrolebindings.RbacRoleBindingList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/rolebinding/{namespace}").
			To(apiHandler.handleListRoleBindingsOriginal).
			Writes(rolebinding.RoleBindingList{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/rolebinding/{namespace}").
			To(apiHandler.handleCreateRoleBinding).
			Doc("creates a rolebinding").
			Writes(rbacv1.RoleBinding{}))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/rolebinding/{namespace}/{name}").
			To(apiHandler.handleDeleteRoleBindingsOriginal).
			Doc("delete a rolebinding").
			Writes(rbacv1.RoleBinding{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/rbac/status").
	//		To(apiHandler.handleRbacStatus).
	//		Writes(validation.RbacStatus{}))

	// endregion

	//apiV1Ws.Route(
	//	apiV1Ws.GET("/persistentvolume").
	//		To(apiHandler.handleGetPersistentVolumeList).
	//		Writes(persistentvolume.PersistentVolumeList{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/persistentvolume/{persistentvolume}").
	//		To(apiHandler.handleGetPersistentVolumeDetail).
	//		Writes(persistentvolume.PersistentVolumeDetail{}))
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/persistentvolume/namespace/{namespace}/name/{persistentvolume}").
	//		To(apiHandler.handleGetPersistentVolumeDetail).
	//		Writes(persistentvolume.PersistentVolumeDetail{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/persistentvolumeclaim/").
	//		To(apiHandler.handleGetPersistentVolumeClaimList).
	//		Writes(persistentvolumeclaim.PersistentVolumeClaimList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/persistentvolumeclaim/{namespace}").
			To(apiHandler.handleGetPersistentVolumeClaimList).
			Writes(persistentvolumeclaim.PersistentVolumeClaimList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/persistentvolumeclaim/{namespace}/{name}").
			To(apiHandler.handleGetPersistentVolumeClaimDetail).
			Writes(persistentvolumeclaim.PersistentVolumeClaimDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/persistentvolumeclaim/{namespace}").
			To(apiHandler.handleCreatePersistentVolumeClaim).
			Reads(persistentvolumeclaim.PersistentVolumeClaimDetail{}).
			Writes(persistentvolumeclaim.PersistentVolumeClaimDetail{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/persistentvolumeclaim/{namespace}/{name}").
			To(apiHandler.handleUpdatePersistentVolumeClaim).
			Writes(persistentvolumeclaim.PersistentVolumeClaimDetail{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/persistentvolumeclaim/{namespace}/{name}").
			To(apiHandler.handleDeletePersistentVolumeClaim).
			Writes(persistentvolumeclaim.PersistentVolumeClaimDetail{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/persistentvolumeclaim/{namespace}/{name}/actions/tradeapp").
			To(apiHandler.handleUpdatePersistentVolumeClaimBelongApp).
			Reads(common.AppNameDetail{}).
			Writes(persistentvolumeclaim.PersistentVolumeClaimDetail{}).
			Doc("update persistentvolumeclaim belongs app").
			Returns(200, "OK", persistentvolumeclaim.PersistentVolumeClaimDetail{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/storageclass").
			To(apiHandler.handleGetStorageClassList).
			Writes(storageclass.StorageClassList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/storageclass/{storageclass}").
			To(apiHandler.handleGetStorageClass).
			Writes(storageclass.StorageClass{}))

	// apiV1Ws.Route(
	// 	apiV1Ws.GET("/storageclass/{storageclass}/persistentvolume").
	// 		To(apiHandler.handleGetStorageClassPersistentVolumes).
	// 		Writes(persistentvolume.PersistentVolumeList{}))

	//apiV1Ws.Route(
	//	apiV1Ws.GET("/log/source/{namespace}/{resourceName}/{resourceType}").
	//		To(apiHandler.handleLogSource).
	//		Writes(controller.LogSources{}))

	// region log
	apiV1Ws.Route(
		apiV1Ws.GET("/log/{namespace}/{pod}").
			To(apiHandler.handleLogs).
			Writes(logs.LogDetails{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/log/{namespace}/{pod}/{container}").
			To(apiHandler.handleLogs).
			Writes(logs.LogDetails{}))
	//
	apiV1Ws.Route(
		apiV1Ws.GET("/log/file/{namespace}/{pod}/{container}").
			To(apiHandler.handleLogFile).
			Writes(logs.LogDetails{}))
	// endregion

	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/overview/").
	//		To(apiHandler.handleOverview).
	//		Writes(overview.Overview{}))
	//
	//apiV1Ws.Route(
	//	apiV1Ws.GET("/overview/{namespace}").
	//		To(apiHandler.handleOverview).
	//		Writes(overview.Overview{}))
	//

	// region others
	apiV1Ws.Route(
		apiV1Ws.GET("/others").
			To(apiHandler.handleOtherResourcesList).
			Writes(other.ResourceList{}).
			Doc("get all resources").
			Param(restful.QueryParameter("filterBy", "filter option separated by comma. For example parameter1,value1,parameter2,value2 - means that the data should be filtered by parameter1 equals value1 and parameter2 equals value2").
				DataType("string").
				AllowableValues(map[string]string{
					"name":      "search by name partial match",
					"namespace": "filter by namespace",
					"kind":      "filter by kind",
					"scope":     "allowed value `namespaced` and `clustered` filter by if a resource is namespaced",
				})).
			Param(restful.QueryParameter("sortBy", "sort option separated by comma. For example a,parameter1,d,parameter2 - means that the data should be sorted by parameter1 (ascending) and later sort by parameter2 (descending)").
				DataType("string").
				AllowableValues(map[string]string{
					"name":              "",
					"namespace":         "",
					"kind":              "",
					"creationTimestamp": "",
				})).
			Param(restful.QueryParameter("itemsPerPage", "items per page").
				DataType("integer")).
			Param(restful.QueryParameter("page", "page number").DataType("integer")).
			Returns(200, "OK", other.ResourceList{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/others").
			To(apiHandler.handleOtherResourceCreate).
			Doc("create a resource").
			Reads([]unstructured.Unstructured{}).
			Consumes(restful.MIME_JSON).
			Returns(200, "OK", CreateResponse{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/releases").
			To(apiHandler.handleReleaseCreate).
			Doc("create a release").
			Reads([]unstructured.Unstructured{}).
			Consumes(restful.MIME_JSON).
			Returns(200, "OK", []unstructured.Unstructured{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/releases/{namespace}/{name}").
			To(apiHandler.handleGetReleaseDetail).
			Doc("get a release").
			Reads(release.ReleaseDetails{}).
			Consumes(restful.MIME_JSON).
			Returns(200, "OK", release.ReleaseDetails{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/others/{group}/{version}/{kind}/{namespace}/{name}").
			To(apiHandler.handleOtherResourceDetail).
			Writes(other.OtherResourceDetail{}).
			Doc("get a resource detail with events").
			Returns(200, "OK", other.OtherResourceDetail{}))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/others/{group}/{version}/{kind}/{namespace}/{name}").
			To(apiHandler.handleOtherResourceDetail).
			Doc("delete a resource"))

	apiV1Ws.Route(
		apiV1Ws.PUT("/others/{group}/{version}/{kind}/{namespace}/{name}").
			To(apiHandler.handleOtherResourceDetail).
			Doc("update a resource with whole resource json").
			Reads(unstructured.Unstructured{}).
			Consumes(restful.MIME_JSON))

	apiV1Ws.Route(
		apiV1Ws.PATCH("/others/{group}/{version}/{kind}/{namespace}/{name}/{field}").
			To(apiHandler.handleOtherResourcePatch).
			Doc("update resource annotations or labels").
			Reads(other.FieldPayload{}).
			Consumes(restful.MIME_JSON))
	// endregion

	// ---- DEVOPS APIS ----

	// region Jenkins
	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinses").
			To(apiHandler.handleGetJenkins).
			Writes(jenkins.JenkinsList{}).
			Doc("get jenkins list").
			Returns(200, "OK", jenkins.JenkinsList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinses/{name}").
			To(apiHandler.handleRetriveJenkins).
			Writes(v1alpha1.Jenkins{}).
			Doc("retrieve jenkins config").
			Returns(200, "OK", v1alpha1.Jenkins{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinses/{name}/resources").
			To(apiHandler.handleGetJenkinsResources).
			Writes(common.ResourceList{}).
			Doc("retrieve resources associated with jenkins").
			Returns(200, "OK", common.ResourceList{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/jenkinses/{name}").
			To(apiHandler.handleDeleteJenkins).
			Writes(jenkins.Jenkins{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/jenkinses/{name}").
			To(apiHandler.handlePutJenkins).
			Writes(v1alpha1.Jenkins{}).
			Doc("update jenkins config").
			Returns(200, "OK", v1alpha1.Jenkins{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/jenkinses").
			To(apiHandler.handleCreateJenkins).
			Writes(v1alpha1.Jenkins{}).
			Doc("update jenkins config").
			Returns(200, "OK", v1alpha1.Jenkins{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinsbinding").
			To(apiHandler.handleGetJenkinsBindingList).
			Writes(jenkinsbinding.JenkinsBindingList{}).
			Doc("get jenkinsbinding list").
			Returns(200, "OK", jenkinsbinding.JenkinsBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinsbinding/{namespace}").
			To(apiHandler.handleGetJenkinsBindingList).
			Writes(jenkinsbinding.JenkinsBindingList{}).
			Doc("get namespaced jenkinsbinding list").
			Returns(200, "OK", jenkinsbinding.JenkinsBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinsbinding/{namespace}/{name}").
			To(apiHandler.handleGetJenkinsBinding).
			Doc("get jenkinsbinding details").
			Writes(v1alpha1.JenkinsBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinsbinding/{namespace}/{name}/croncheck").
			To(apiHandler.handleCronCheck).
			Doc("cron syntax check").
			Writes(jenkinsbinding.CronCheckResult{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/jenkinsbinding/{namespace}/{name}/resources").
			To(apiHandler.handleGetJenkinsBindingResources).
			Writes(common.ResourceList{}).
			Doc("retrieve resources associated with jenkinsbinding").
			Returns(200, "OK", common.ResourceList{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/jenkinsbinding/{namespace}/{name}").
			To(apiHandler.handleDeleteJenkinsBinding).
			Writes(v1alpha1.JenkinsBinding{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/jenkinsbinding/{namespace}").
			To(apiHandler.handleCreateJenkinsBinding).
			Writes(v1alpha1.JenkinsBinding{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/jenkinsbinding/{namespace}/{name}").
			To(apiHandler.handleUpdateJenkinsBinding).
			Writes(v1alpha1.JenkinsBinding{}))
	// endregion

	//domain
	// region DomainBinding
	apiV1Ws.Route(
		apiV1Ws.GET("/domainbinding").
			To(apiHandler.handleGetDomainBindingList).
			Writes(domainbinding.DomainBindingList{}).
			Doc("get domianbinding list"))
	apiV1Ws.Route(
		apiV1Ws.POST("/domainbinding").
			To(apiHandler.handleCreateDomainBinding).
			Writes(domainbinding.DomainBindingDetail{}).
			Doc("create domainbinding"))
	domainBindDetailURI := "/domainbinding/{name}"
	apiV1Ws.Route(
		apiV1Ws.GET(domainBindDetailURI).
			To(apiHandler.handleGetDomainBindingDetail).
			Writes(domainbinding.DomainBindingDetail{}).
			Doc("get domainbinding detail"))
	apiV1Ws.Route(
		apiV1Ws.PUT(domainBindDetailURI).
			To(apiHandler.handleUpdateDomainBindingDetail).
			Writes(domainbinding.DomainBindingDetail{}).
			Doc("update domainbinding detail"))
	apiV1Ws.Route(
		apiV1Ws.DELETE(domainBindDetailURI).
			To(apiHandler.handleDeleteDomainBindingDetail).
			Doc("delete domainbinding detailt"))
	// endregion

	apiV1Ws.Route(
		apiV1Ws.GET("/chart/{name}").
			To(apiHandler.handleGetChartDetail).
			Writes(catalog.Chart{}).
			Doc("get chart detail"))

	// region PipelineTemplate
	// PipelineTemplateSync
	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplatesync/{namespace}").
			To(apiHandler.handleGetPipelineTemplateSyncList).
			Writes(pipelinetemplatesync.PipelineTemplateSyncList{}).
			Doc("get pipelineTemplateSync list").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSyncList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplatesync/{namespace}/{name}").
			To(apiHandler.handleGetPipelineTemplateSync).
			Writes(pipelinetemplatesync.PipelineTemplateSync{}).
			Doc("get detail of specific PipelineTemplateSync").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSync{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipelinetemplatesync/{namespace}").
			To(apiHandler.handleCreatePipelineTemplateSync).
			Writes(pipelinetemplatesync.PipelineTemplateSync{}).
			Doc("create a pipelineTemplateSync").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSync{}))

	apiV1Ws.Route(
		apiV1Ws.PUT("/pipelinetemplatesync/{namespace}/{name}").
			To(apiHandler.handleUpdatePipelineTemplateSync).
			Writes(pipelinetemplatesync.PipelineTemplateSync{}).
			Doc("update a pipelineTemplateSync").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSync{}))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/pipelinetemplatesync/{namespace}/{name}").
			To(apiHandler.handleDeletePipelineTemplateSync).
			Writes(struct{}{}).
			Doc("delete a PipelineTemplateSync").
			Returns(200, "OK", struct{}{}))

	// PipelineTaskTemplate
	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetasktemplate/{namespace}").
			To(apiHandler.handleGetPipelineTaskTemplateList).
			Writes(pipelinetasktemplate.PipelineTaskTemplateList{}).
			Doc("get a list of PipelineTaskTemplate").
			Returns(200, "OK", pipelinetasktemplate.PipelineTaskTemplate{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetasktemplate/{namespace}/{name}").
			To(apiHandler.handleGetPipelineTaskTemplate).
			Writes(pipelinetasktemplate.PipelineTaskTemplate{}).
			Doc("get a PipelineTaskTemplate").
			Returns(200, "OK", pipelinetasktemplate.PipelineTaskTemplate{}))

	// ClusterPipelineTemplate
	apiV1Ws.Route(
		apiV1Ws.GET("/clusterpipelinetemplate").
			To(apiHandler.handleGetClusterPipelineTemplateList).
			Writes(clusterpipelinetemplate.ClusterPipelineTemplateList{}).
			Doc("get a list of ClusterPipelineTemplate").
			Returns(200, "OK", clusterpipelinetemplate.ClusterPipelineTemplateList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/clusterpipelinetemplate/{name}").
			To(apiHandler.handleGetClusterPipelineTemplate).
			Writes(clusterpipelinetemplate.ClusterPipelineTemplate{}).
			Doc("get a ClusterPipelineTemplate").
			Returns(200, "OK", clusterpipelinetemplate.ClusterPipelineTemplate{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/clusterpipelinetemplate/{name}/preview").
			To(apiHandler.handlePreviewClusterPipelineTemplate).
			Writes(clusterpipelinetemplate.PreviewOptions{}).
			Doc("preview a ClusterPipelineTemplate").
			Returns(200, "OK", ""))

	apiV1Ws.Route(
		apiV1Ws.GET("/clusterpipelinetemplate/{name}/exports").
			To(apiHandler.handlerExportsClusterPiplineTemplate).
			Writes(clusterpipelinetemplate.PipelineExportedVariables{}).
			Doc("get the exports in clusterpipelinetemplate").
			Returns(200, "OK", clusterpipelinetemplate.PipelineExportedVariables{}))

	// PipelineTemplateSync
	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplatesync/{namespace}").
			To(apiHandler.handleGetPipelineTemplateSyncList).
			Writes(pipelinetemplatesync.PipelineTemplateSyncList{}).
			Doc("get pipelineTemplateSync list").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSyncList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplatesync/{namespace}/{name}").
			To(apiHandler.handleGetPipelineTemplateSync).
			Writes(pipelinetemplatesync.PipelineTemplateSync{}).
			Doc("get detail of specific PipelineTemplateSync").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSync{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipelinetemplatesync/{namespace}").
			To(apiHandler.handleCreatePipelineTemplateSync).
			Writes(pipelinetemplatesync.PipelineTemplateSync{}).
			Doc("create a pipelineTemplateSync").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSync{}))

	apiV1Ws.Route(
		apiV1Ws.PUT("/pipelinetemplatesync/{namespace}/{name}").
			To(apiHandler.handleUpdatePipelineTemplateSync).
			Writes(pipelinetemplatesync.PipelineTemplateSync{}).
			Doc("update a pipelineTemplateSync").
			Returns(200, "OK", pipelinetemplatesync.PipelineTemplateSync{}))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/pipelinetemplatesync/{namespace}/{name}").
			To(apiHandler.handleDeletePipelineTemplateSync).
			Writes(struct{}{}).
			Doc("delete a PipelineTemplateSync").
			Returns(200, "OK", struct{}{}))

	// PipelineTaskTemplate
	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetasktemplate/{namespace}").
			To(apiHandler.handleGetPipelineTaskTemplateList).
			Writes(pipelinetasktemplate.PipelineTaskTemplateList{}).
			Doc("get a list of PipelineTaskTemplate").
			Returns(200, "OK", pipelinetasktemplate.PipelineTaskTemplate{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetasktemplate/{namespace}/{name}").
			To(apiHandler.handleGetPipelineTaskTemplate).
			Writes(pipelinetasktemplate.PipelineTaskTemplate{}).
			Doc("get a PipelineTaskTemplate").
			Returns(200, "OK", pipelinetasktemplate.PipelineTaskTemplate{}))

	// PipelineTemplate
	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplate/{namespace}").
			To(apiHandler.handleGetPipelineTemplateList).
			Writes(pipelinetemplate.PipelineTemplateList{}).
			Doc("get a list of PipelineTemplate").
			Returns(200, "OK", pipelinetemplate.PipelineTemplateList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplate/{namespace}/{name}").
			To(apiHandler.handleGetPipelineTemplate).
			Writes(pipelinetemplate.PipelineTemplate{}).
			Doc("get a PipelineTemplate").
			Returns(200, "OK", pipelinetemplate.PipelineTemplate{}))

	apiV1Ws.Route(
		apiV1Ws.POST("pipelinetemplate/{namespace}/{name}/preview").
			To(apiHandler.handlePreviewPipelineTemplate).
			Writes(pipelinetemplate.PreviewOptions{}).
			Doc("jenkinsfile preview from PipelineTemplate").
			Returns(200, "OK", ""))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplate/{namespace}/{name}/exports").
			To(apiHandler.handlerExportsPiplineTemplate).
			Writes(clusterpipelinetemplate.PipelineExportedVariables{}).
			Doc("get the exports in pipelinetemplate").
			Returns(200, "OK", clusterpipelinetemplate.PipelineExportedVariables{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelinetemplatecategories/{namespace}").
			To(apiHandler.handlePipelinetemplatecategories).
			Writes(pipelinetemplate.PipelineTemplateCategoryList{}).
			Doc("get a PipelineTemplate").
			Returns(200, "OK", pipelinetemplate.PipelineTemplateCategoryList{}))

	// endregion

	// region Pipeline
	apiV1Ws.Route(
		apiV1Ws.GET("/pipelineconfig/{namespace}").
			To(apiHandler.handleGetPipelineConfigList).
			Writes(pipelineconfig.PipelineConfigList{}).
			Doc("get namespaced pipelineconfig list").
			Returns(200, "OK", pipelineconfig.PipelineConfigList{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipelineconfig/{namespace}").
			To(apiHandler.handleCreatePipelineConfig).
			Writes(pipelineconfig.PipelineConfigDetail{}).
			Doc("creates namespaced pipelineconfig").
			Returns(200, "OK", pipelineconfig.PipelineConfigDetail{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelineconfig/{namespace}/{name}").
			To(apiHandler.handleGetPipelineConfigDetail).
			Writes(pipelineconfig.PipelineConfig{}).
			Doc("get pipeline config details").
			Returns(200, "OK", pipelineconfig.PipelineConfigDetail{}))

	apiV1Ws.Route(
		apiV1Ws.PUT("/pipelineconfig/{namespace}/{name}").
			To(apiHandler.handleUpdatePipelineConfig).
			Writes(pipelineconfig.PipelineConfig{}).
			Doc("update pipeline config").
			Returns(200, "OK", pipelineconfig.PipelineConfigDetail{}))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/pipelineconfig/{namespace}/{name}").
			To(apiHandler.handleDeletePipelineConfig).
			Writes(struct{}{}).
			Doc("deletes a pipeline config").
			Returns(200, "OK", struct{}{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipelineconfig/{namespace}/{name}/trigger").
			To(apiHandler.handleTriggerPipelineConfig).
			Writes(pipelineconfig.PipelineConfigTrigger{}).
			Doc("triggers pipeline").
			Returns(200, "OK", pipelineconfig.PipelineTriggerResponse{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipelineconfig/{namespace}/{name}/preview").
			To(apiHandler.handlePreviewPipelineConfig).
			Writes(pipelineconfig.PipelineConfigDetail{}).
			Doc("jenkinsfile preview").
			Returns(200, "OK", ""))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipelineconfig/{namespace}/{name}/scan").
			To(apiHandler.handleScanPipelineConfig).
			Doc("scan multi-branch").
			Returns(200, "OK", ""))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipelineconfig/{namespace}/{name}/logs").
			Param(restful.PathParameter("namespace", "Namespace to use")).
			Param(restful.PathParameter("name", "Pipeline name to filter scope")).
			Param(restful.QueryParameter("start", "Start offset to fetch logs")).
			To(apiHandler.handlePipelineConfigLogs).
			Doc("gets scan logs for multi-branch pipeline").
			Returns(200, "OK", v1alpha1.PipelineConfigLog{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipeline/{namespace}").
			To(apiHandler.handleGetPipelineList).
			Writes(pipeline.PipelineList{}).
			Doc("get namespaced pipeline list").
			Returns(200, "OK", pipeline.PipelineList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipeline/{namespace}/{name}").
			Param(restful.QueryParameter("withFreshStages", "Whether to retrieve newest stages from Jenkins")).
			To(apiHandler.handleGetPipelineDetail).
			Writes(pipeline.Pipeline{}).
			Doc("get pipeline details").
			Returns(200, "OK", pipeline.Pipeline{}))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/pipeline/{namespace}/{name}").
			To(apiHandler.handleDeletePipeline).
			Writes(struct{}{}).
			Doc("deletes a pipeline").
			Returns(200, "OK", struct{}{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/pipeline/{namespace}/{name}/retry").
			To(apiHandler.handleRetryPipelineDetail).
			Writes(pipeline.RetryRequest{}).
			Doc("retries a pipeline").
			Returns(200, "OK", v1alpha1.Pipeline{}))

	apiV1Ws.Route(
		apiV1Ws.PUT("/pipeline/{namespace}/{name}/abort").
			To(apiHandler.handleAbortPipeline).
			Writes(pipeline.AbortRequest{}).
			Doc("aborts a pipeline").
			Returns(200, "OK", v1alpha1.Pipeline{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/pipeline/{namespace}/{name}/logs").
			Param(restful.PathParameter("namespace", "Namespace to use")).
			Param(restful.PathParameter("name", "Pipeline name to filter scope")).
			Param(restful.QueryParameter("start", "Start offset to fetch logs")).
			Param(restful.QueryParameter("stage", "Stage to fetch logs from")).
			Param(restful.QueryParameter("step", "Step to fetch logs from. Can be combined with stage")).
			To(apiHandler.handlePipelineLogs).
			Doc("gets logs for pipeline").
			Returns(200, "OK", v1alpha1.PipelineLog{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/pipeline/{namespace}/{name}/tasks").
			Param(restful.PathParameter("namespace", "Namespace to use")).
			Param(restful.PathParameter("name", "Pipeline name to filter scope")).
			Param(restful.QueryParameter("stage", "Stage to fetch steps from. If not provided will return all stages")).
			To(apiHandler.handlePipelineTasks).
			Doc("gets steps for pipeline").
			Returns(200, "OK", v1alpha1.PipelineTask{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/pipeline/{namespace}/{name}/inputs").
			To(apiHandler.handlePipelineInput).
			Writes(pipeline.InputOptions{}).
			Doc("response a input request which in a pipeline").
			Returns(200, "OK", pipeline.InputResponse{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/pipeline/{namespace}/{name}/testreports").
			Param(restful.QueryParameter("start", "Start offset to fetch test report items")).
			Param(restful.QueryParameter("limit", "Limit of number to fetch test report items")).
			To(apiHandler.handlePipelineTestReports).
			Doc("response a input request which in a pipeline").
			Returns(200, "OK", pipeline.PipelineTestReports{}))

	// endregion

	// region CodeRepository
	apiV1Ws.Route(
		apiV1Ws.POST("/codereposervice").
			To(apiHandler.handleCreateCodeRepoService).
			Writes(codereposervice.CodeRepoServiceList{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/codereposervice/{name}").
			To(apiHandler.handleDeleteCodeRepoService).
			Writes(codereposervice.CodeRepoService{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/codereposervice/{name}").
			To(apiHandler.handleUpdateCodeRepoService).
			Writes(v1alpha1.CodeRepoService{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codereposervice").
			To(apiHandler.handleGetCodeRepoServiceList).
			Writes(codereposervice.CodeRepoServiceList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codereposervices").
			To(apiHandler.handleGetCodeRepoServiceList).
			Writes(codereposervice.CodeRepoServiceList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codereposervice/{name}").
			To(apiHandler.handleGetCodeRepoServiceDetail).
			Writes(v1alpha1.CodeRepoService{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codereposervice/{name}/resources").
			To(apiHandler.handleGetCodeRepoServiceResourceList).
			Writes(common.ResourceList{}).
			Doc("retrieve resources associated with codereposervice").
			Returns(200, "OK", common.ResourceList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codereposervice/{name}/secrets").
			To(apiHandler.handleGetCodeRepoServiceSecretList).
			Writes(secret.SecretList{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/coderepobinding/{namespace}").
			To(apiHandler.handleCreateCodeRepoBinding).
			Writes(v1alpha1.CodeRepoBinding{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/coderepobinding/{namespace}/{name}").
			To(apiHandler.handleDeleteCodeRepoBinding).
			Writes(v1alpha1.CodeRepoBinding{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/coderepobinding/{namespace}/{name}").
			To(apiHandler.handleUpdateCodeRepoBinding).
			Writes(struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding").
			To(apiHandler.handleGetCodeRepoBindingList).
			Writes(coderepobinding.CodeRepoBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding/{namespace}").
			To(apiHandler.handleGetCodeRepoBindingList).
			Writes(coderepobinding.CodeRepoBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding/{namespace}/{name}").
			To(apiHandler.handleGetCodeRepoBindingDetail).
			Writes(v1alpha1.CodeRepoBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding/{namespace}/{name}/resources").
			To(apiHandler.handleGetCodeRepoBindingResources).
			Writes(common.ResourceList{}).
			Doc("retrieve resources associated with coderepobinding").
			Returns(200, "OK", common.ResourceList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding/{namespace}/{name}/secrets").
			To(apiHandler.handleGetCodeRepoBindingSecretList).
			Writes(secret.SecretList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding/{namespace}/{name}/repositories").
			To(apiHandler.handleGetCodeRepositoryListInBinding).
			Writes(coderepository.CodeRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepobinding/{namespace}/{name}/remote-repositories").
			To(apiHandler.handleGetRemoteRepositoryList).
			Writes(coderepository.CodeRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/coderepository/{namespace}").
			To(apiHandler.handleGetCodeRepositoryList).
			Writes(coderepository.CodeRepositoryList{}).
			Doc("get namespaced coderepository list").
			Returns(200, "OK", coderepository.CodeRepositoryList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/coderepository/{namespace}/{name}/branches").
			Param(restful.PathParameter("sortBy", "sort option. The choices are creationTime")).
			Param(restful.PathParameter("sortMode", "sort option. The choices are desc or asc")).
			To(apiHandler.HandleGetCodeRepositoryBranches).
			Returns(200, "Get coderepo branch Successful", v1alpha1.CodeRepoBranchResult{}))

	// endregion

	// region ToolChain
	apiV1Ws.Route(
		apiV1Ws.GET("/toolchain").
			To(apiHandler.handleGetToolChains).
			Writes(toolchain.ToolChainList{}).
			Doc("get namespaced coderepository list").
			Returns(200, "OK", coderepository.CodeRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/toolchain/bindings").
			To(apiHandler.handleGetToolChainBindings).
			Writes(toolchain.ToolChainBindingList{}).
			Doc("get toolchain binding list").
			Returns(200, "OK", coderepository.CodeRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/toolchain/bindings/{namespace}").
			To(apiHandler.handleGetToolChainBindings).
			Writes(toolchain.ToolChainBindingList{}).
			Doc("get namespaced toolchain binding list").
			Returns(200, "OK", coderepository.CodeRepositoryList{}))
	// endregion

	// region callback
	apiV1Ws.Route(
		apiV1Ws.GET("/callback/oauth/{namespace}/secret/{secretNamespace}/{secretName}/codereposervice/{serviceName}").
			To(apiHandler.handleOAuthCallback).
			Writes(struct{}{}))
	// endregion

	// region ImageRegistry
	apiV1Ws.Route(
		apiV1Ws.POST("/imageregistry").
			To(apiHandler.handleCreateImageRegistry).
			Writes(imageregistry.ImageRegistryList{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/imageregistry/{name}").
			To(apiHandler.handleDeleteImageRegsitry).
			Writes(imageregistry.ImageRegistry{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/imageregistry/{name}").
			To(apiHandler.handleUpdateImageRegistry).
			Writes(v1alpha1.ImageRegistry{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistry").
			To(apiHandler.handleGetImageRegistryList).
			Writes(imageregistry.ImageRegistryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistry/{name}").
			To(apiHandler.handleGetImageRegistryDetail).
			Writes(v1alpha1.ImageRegistry{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistry/{name}/secrets").
			To(apiHandler.handleGetImageRegistrySecretList).
			Writes(secret.SecretList{}))
	// endregion

	// region ImageRegistryBinding
	apiV1Ws.Route(
		apiV1Ws.POST("/imageregistrybinding/{namespace}").
			To(apiHandler.handleCreateImageRegistryBinding).
			Writes(v1alpha1.ImageRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.PUT(URLIMAGEREGISTRYBINDINGDETAIL).
			To(apiHandler.handleUpdateImageRegistryBinding).
			Writes(v1alpha1.ImageRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE(URLIMAGEREGISTRYBINDINGDETAIL).
			To(apiHandler.handleDeleteImageRegistryBinding).
			Writes(v1alpha1.ImageRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistrybinding").
			To(apiHandler.handleGetImageRegistryBindingList).
			Writes(imageregistrybinding.ImageRegistryBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistrybinding/{namespace}").
			To(apiHandler.handleGetImageRegistryBindingList).
			Writes(imageregistrybinding.ImageRegistryBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET(URLIMAGEREGISTRYBINDINGDETAIL).
			To(apiHandler.handleGetImageRegistryBindingDetail).
			Writes(v1alpha1.ImageRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistrybinding/{namespace}/{name}/secrets").
			To(apiHandler.handleGetImageRegistryBindingSecretList).
			Writes(secret.SecretList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistrybinding/{namespace}/{name}/repositories").
			To(apiHandler.handleGetImageRepositoryListInBinding).
			Writes(imagerepository.ImageRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistrybinding/{namespace}/{name}/remote-repositories").
			To(apiHandler.handleGetImageOriginRepositoryList).
			Writes(imagerepository.ImageRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imageregistrybinding/{namespace}/{name}/remote-repositories-project").
			To(apiHandler.handleGetImageOriginRepositoryProjectList).
			Writes(imagerepository.ImageRepositoryList{}))
	// endregion

	// region ImageRepository
	apiV1Ws.Route(
		apiV1Ws.GET("/imagerepository/{namespace}").
			To(apiHandler.handleGetImageRepositoryList).
			Writes(imagerepository.ImageRepositoryList{}).
			Doc("get namespaced imagerepository list").
			Returns(200, "OK", imagerepository.ImageRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imagerepositoryproject/{namespace}").
			To(apiHandler.handleGetImageRepositoryProjectList).
			Writes(imagerepository.ImageRepositoryList{}).
			Doc("get namespaced imagerepository list").
			Returns(200, "OK", imagerepository.ImageRepositoryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imagerepository/{namespace}/{name}").
			To(apiHandler.handleGetImageRepositoryDetail).
			Writes(v1alpha1.ImageRepository{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/imagerepository/{namespace}/{name}/tags").
			Param(restful.PathParameter("sortBy", "sort option. The choices are creationTime")).
			Param(restful.PathParameter("sortMode", "sort option. The choices are desc or asc")).
			To(apiHandler.HandleGetImageTags).
			Returns(200, "Get Image tags Successful", v1alpha1.ImageTagResult{}))
	apiV1Ws.Route(
		apiV1Ws.POST("imagerepository/{namespace}/{name}/security").
			Param(restful.PathParameter("tag", "Scan image tag name")).
			To(apiHandler.HandleScanImage).
			Returns(200, "Create Scan Image Job Successful.", v1alpha1.ImageResult{}))
	apiV1Ws.Route(
		apiV1Ws.GET("imagerepository/{namespace}/{name}/security").
			Param(restful.PathParameter("tag", "Get image vulnerability tag name")).
			To(apiHandler.HandleGetVulnerability).
			Returns(200, "Get Image Vulnerability Successful", v1alpha1.VulnerabilityList{}))
	// endregion

	// region microservicesenvironments
	apiV1Ws.Route(
		apiV1Ws.GET("/microservicesenvironments").
			Filter(mw.Product(ACPServiceFramework)).
			To(apiHandler.handleMicroservicesEnvironmentList).
			Writes(asfClient.MicroservicesEnvironmentList{}).
			Doc("get microservicesenvironment list").
			Returns(200, "OK", asfClient.MicroservicesEnvironmentList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/microservicesenvironments/{name}").
			Filter(mw.Product(ACPServiceFramework)).
			Writes(microservicesenvironment.MicroservicesEnvironmentDetail{}).
			To(apiHandler.handleGetMicroservicesEnviromentDetail).
			Doc("get microservicesenvironments detail by name").
			Returns(200, "OK", microservicesenvironment.MicroservicesEnvironmentDetail{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/microservicescomponent/{namespace}/{name}").
			Filter(mw.Product(ACPServiceFramework)).
			To(apiHandler.handlePutMicroservicesComponent).
			Writes(asfClient.MicroservicesComponent{}).
			Doc("install component").
			Returns(200, "OK", asfClient.MicroservicesComponent{}))

	apiV1Ws.Route(
		apiV1Ws.PUT("/microservicescomponent/{namespace}/{name}").
			Filter(mw.Product(ACPServiceFramework)).
			To(apiHandler.handlePutMicroservicesComponent).
			Writes(asfClient.MicroservicesComponent{}).
			Doc("update component").
			Returns(200, "OK", asfClient.MicroservicesComponent{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/microservicescomponent/{namespace}/{name}/start").
			Filter(mw.Product(ACPServiceFramework)).
			To(apiHandler.handlePutMicroservicesComponentStart).
			Writes(asfClient.MicroservicesComponent{}).
			Doc("start component").
			Returns(200, "OK", asfClient.MicroservicesComponent{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/microservicescomponent/{namespace}/{name}/stop").
			Filter(mw.Product(ACPServiceFramework)).
			To(apiHandler.handlePutMicroservicesComponentStop).
			Writes(asfClient.MicroservicesComponentList{}).
			Doc("stop component").
			Returns(200, "OK", asfClient.MicroservicesComponent{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/microservicesapps").
			Filter(mw.Product(ACPServiceFramework)).
			Writes(microservicesapplication.MicroservicesApplicationList{}).
			To(apiHandler.handleGetMicroservicesApps).
			Doc("get microservicesenvironments detail by name").
			Returns(200, "OK", microservicesapplication.MicroservicesApplicationList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/microservicesconfigs").
			Writes(microservicesconfiguration.MicroservicesConfigurationList{}).
			To(apiHandler.handleGetMicroservicesConfigs).
			Doc("get microservicesenvironments detail by name").
			Returns(200, "OK", microservicesconfiguration.MicroservicesConfigurationList{}))

	apiV1Ws.Route(
		apiV1Ws.GET("/domains").
			Writes(domain.DomainList{}).
			To(apiHandler.handleGetDomainList).
			Doc("get microservicesenvironments detail by name").
			Returns(200, "OK", domain.DomainList{}))

	// endregion

	// region ProjectManagement
	apiV1Ws.Route(
		apiV1Ws.POST("/projectmanagement").
			To(apiHandler.handleCreateProjectManagement).
			Writes(v1alpha1.ProjectManagement{}).
			Doc("create a projectmanagement").
			Returns(200, "OK", v1alpha1.ProjectManagement{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE(URLProjectManagementDetails).
			To(apiHandler.handleDeleteProjectManagement).
			Writes(struct{}{}).
			Doc("delete a projectmanagement").
			Returns(200, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT(URLProjectManagementDetails).
			To(apiHandler.handleUpdateProjectManagement).
			Writes(v1alpha1.ProjectManagement{}).
			Doc("update a projectmanagement").
			Returns(200, "OK", v1alpha1.ProjectManagement{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/projectmanagement").
			To(apiHandler.handleGetProjectManagementList).
			Writes(projectmanagement.ProjectManagementList{}).
			Doc("get projectmanagement list").
			Returns(200, "OK", projectmanagement.ProjectManagementList{}))
	apiV1Ws.Route(
		apiV1Ws.GET(URLProjectManagementDetails).
			To(apiHandler.handleGetProjectManagementDetail).
			Writes(v1alpha1.ProjectManagement{}).
			Doc("get a projectmanagement").
			Returns(200, "OK", v1alpha1.ProjectManagement{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/projectmanagementbinding/{namespace}").
			To(apiHandler.handleCreateProjectManagementBinding).
			Writes(v1alpha1.ProjectManagementBinding{}).
			Doc("create a projectmanagementbinding").
			Returns(200, "OK", v1alpha1.ProjectManagementBinding{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE(URLProjectManagementBindingDetails).
			To(apiHandler.handleDeleteProjectManagementBinding).
			Writes(struct{}{}).
			Doc("delete a projectmanagementbinding").
			Returns(200, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT(URLProjectManagementBindingDetails).
			To(apiHandler.handleUpdateProjectManagementBinding).
			Writes(v1alpha1.ProjectManagementBinding{}).
			Doc("update a projectmanagementbinding").
			Returns(200, "OK", v1alpha1.ProjectManagementBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/projectmanagementbinding").
			To(apiHandler.handleGetProjectManagementBindingList).
			Writes(projectmanagementbinding.ProjectManagementBindingList{}).
			Doc("get projectmanagementbinding list in all namespaces").
			Returns(200, "OK", projectmanagementbinding.ProjectManagementBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/projectmanagementbinding/{namespace}").
			To(apiHandler.handleGetProjectManagementBindingList).
			Writes(projectmanagementbinding.ProjectManagementBindingList{}).
			Doc("get projectmanagementbinding list in one namespace").
			Returns(200, "OK", projectmanagementbinding.ProjectManagementBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET(URLProjectManagementBindingDetails).
			To(apiHandler.handleGetProjectManagementBindingDetail).
			Writes(v1alpha1.ProjectManagementBinding{}).
			Doc("get a projectmanagementbinding").
			Returns(200, "OK", v1alpha1.ProjectManagementBinding{}))
	// endregion

	// region TestTool
	apiV1Ws.Route(
		apiV1Ws.POST("/testtool").
			To(apiHandler.handleCreateTestTool).
			Writes(v1alpha1.TestTool{}).
			Doc("create a testtool").
			Returns(200, "OK", v1alpha1.TestTool{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE(URLTestToolDetails).
			To(apiHandler.handleDeleteTestTool).
			Writes(struct{}{}).
			Doc("delete a testtool").
			Returns(200, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT(URLTestToolDetails).
			To(apiHandler.handleUpdateTestTool).
			Writes(v1alpha1.TestTool{}).
			Doc("update a testtool").
			Returns(200, "OK", v1alpha1.TestTool{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/testtool").
			To(apiHandler.handleGetTestToolList).
			Writes(testtool.TestToolList{}).
			Doc("get testtool list").
			Returns(200, "OK", testtool.TestToolList{}))
	apiV1Ws.Route(
		apiV1Ws.GET(URLTestToolDetails).
			To(apiHandler.handleGetTestToolDetail).
			Writes(v1alpha1.TestTool{}).
			Doc("get a testtool").
			Returns(200, "OK", v1alpha1.TestTool{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/testtoolbinding/{namespace}").
			To(apiHandler.handleCreateTestToolBinding).
			Writes(v1alpha1.TestToolBinding{}).
			Doc("create a testtoolbinding").
			Returns(200, "OK", v1alpha1.TestToolBinding{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE(URLTestToolBindingDetails).
			To(apiHandler.handleDeleteTestToolBinding).
			Writes(struct{}{}).
			Doc("delete a testtoolbinding").
			Returns(200, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.PUT(URLTestToolBindingDetails).
			To(apiHandler.handleUpdateTestToolBinding).
			Writes(v1alpha1.TestToolBinding{}).
			Doc("update a testtoolbinding").
			Returns(200, "OK", v1alpha1.TestToolBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/testtoolbinding").
			To(apiHandler.handleGetTestToolBindingList).
			Writes(testtoolbinding.TestToolBindingList{}).
			Doc("get testtoolbinding list in all namespaces").
			Returns(200, "OK", testtoolbinding.TestToolBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/testtoolbinding/{namespace}").
			To(apiHandler.handleGetTestToolBindingList).
			Writes(testtoolbinding.TestToolBindingList{}).
			Doc("get testtoolbinding list in one namespace").
			Returns(200, "OK", testtoolbinding.TestToolBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET(URLTestToolBindingDetails).
			To(apiHandler.handleGetTestToolBindingDetail).
			Writes(v1alpha1.TestToolBinding{}).
			Doc("get a testtoolbinding").
			Returns(200, "OK", v1alpha1.TestToolBinding{}))
	// endregion

	apiV1Ws.Route(
		apiV1Ws.GET("/microservicesconfigs").
			Filter(mw.Product(ACPServiceFramework)).
			Writes(microservicesconfiguration.MicroservicesConfigurationList{}).
			To(apiHandler.handleGetMicroservicesConfigs).
			Doc("get microservicesenvironments detail by name").
			Returns(200, "OK", microservicesconfiguration.MicroservicesConfigurationList{}))

	// region Statistics
	apiV1Ws.Route(
		apiV1Ws.GET("/statistics/pipeline/{namespace}").
			To(apiHandler.handleGetPipelineStatistics).
			Writes(struct{}{}).
			Doc("get the statistics info of pipeline").
			Returns(200, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/statistics/stage/{namespace}").
			To(apiHandler.handleGetStageStatistics).
			Writes(struct{}{}).
			Doc("get the statistics info of stage").
			Returns(200, "OK", struct{}{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/statistics/codequality/{namespace}").
			To(apiHandler.handleGetCodeQualityStatistics).
			Writes(struct{}{}).
			Doc("get the statistics info of stage").
			Returns(200, "OK", struct{}{}))

	// endregion

	// region CodeQualityTool
	apiV1Ws.Route(
		apiV1Ws.POST("/codequalitytool").
			To(apiHandler.handleCreateCodeQualityTool).
			Writes(v1alpha1.CodeQualityTool{}).
			Doc("create a code quality tool").
			Returns(200, "OK", v1alpha1.CodeQualityTool{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE(URLCODEQUALITYTOOLDETAIL).
			To(apiHandler.handleDeleteCodeQualityTool).
			Writes(v1alpha1.CodeQualityTool{}).
			Doc("delete a code quality tool with name").
			Returns(200, "OK", v1alpha1.CodeQualityTool{}))
	apiV1Ws.Route(
		apiV1Ws.PUT(URLCODEQUALITYTOOLDETAIL).
			To(apiHandler.handleUpdateCodeQualityTool).
			Writes(v1alpha1.CodeQualityTool{}).
			Doc("update a code quality tool with name").
			Returns(200, "OK", v1alpha1.CodeQualityTool{}))
	apiV1Ws.Route(
		apiV1Ws.GET(URLCODEQUALITYTOOLDETAIL).
			To(apiHandler.handleGetCodeQualityTool).
			Writes(v1alpha1.CodeQualityTool{}).
			Doc("get a code quality tool with name").
			Returns(200, "OK", v1alpha1.CodeQualityTool{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalitytool").
			To(apiHandler.handleListCodeQualityTool).
			Writes(v1alpha1.CodeQualityTool{}).
			Doc("list code quality tools").
			Returns(200, "OK", codequalitytool.CodeQualityToolList{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/codequalitybinding/{namespace}").
			To(apiHandler.handleCreateCodeQualityBinding).
			Writes(v1alpha1.CodeQualityBinding{}).
			Doc("create a code quality binding").
			Returns(200, "OK", v1alpha1.CodeQualityBinding{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/codequalitybinding/{namespace}/{name}").
			To(apiHandler.handleUpdateCodeQualityBinding).
			Doc("update a code quality binding with name").
			Returns(200, "OK", v1alpha1.CodeQualityBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalitybinding/{namespace}").
			To(apiHandler.handleGetCodeQualityBindingList).
			Doc("get namespaced code quality binding list").
			Returns(200, "OK", codequalitybinding.CodeQualityBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalitybinding").
			To(apiHandler.handleGetCodeQualityBindingList).
			Doc("get all code quality binding list").
			Returns(200, "OK", codequalitybinding.CodeQualityBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalitybinding/{namespace}/{name}").
			To(apiHandler.handleGetCodeQualityBindingDetail).
			Doc("get code quality binding with name").
			Returns(200, "OK", v1alpha1.CodeQualityBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalitybinding/{namespace}/{name}/projects").
			To(apiHandler.handleGetCodeQualityProjectListInBinding).
			Doc("get code quality project list in binding").
			Returns(200, "OK", codequalityproject.CodeQualityProjectList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalitybinding/{namespace}/{name}/secrets").
			To(apiHandler.handleGetCodeQualityBindingSecretList).
			Doc("get bind secret list").
			Returns(200, "OK", secret.SecretList{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/codequalitybinding/{namespace}/{name}").
			To(apiHandler.handleDeleteCodeQualityBinding).
			Doc("delete code quality binding with name").
			Returns(200, "OK", common.ResourceList{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/codequalityproject/{namespace}").
			To(apiHandler.handleCreateCodeQualityProject).
			Doc("create a code quality project").
			Returns(200, "OK", v1alpha1.CodeQualityProject{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/codequalityproject/{namespace}/{name}").
			To(apiHandler.handleUpdateCodeQualityProject).
			Doc("update a code quality project with name").
			Returns(200, "OK", v1alpha1.CodeQualityProject{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalityproject/{namespace}").
			To(apiHandler.handleGetCodeQualityProjectList).
			Doc("create a code quality project").
			Returns(200, "OK", codequalityproject.CodeQualityProjectList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/codequalityproject/{namespace}/{name}").
			To(apiHandler.handleGetCodeQualityProjectDetail).
			Doc("create a code quality project").
			Returns(200, "OK", v1alpha1.CodeQualityProject{}))

	//region asm
	apiV1Ws.Route(
		apiV1Ws.GET("/service/{namespace}").
			To(apiHandler.handleGetServiceListByProject).
			Writes(resourceService.ServiceNameList{}))
	//endregion

	// region asm
	apiV1Ws.Route(
		apiV1Ws.GET("/servicemesh/graphs/{namespace}").
			To(apiHandler.handleGetNamespaceGraph).
			Doc("get namespace service graph").
			Returns(200, "OK", servicegraph.Graph{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/servicemesh/metrics").
			To(apiHandler.handleGetMetrics).
			Doc("get metrics from given options").
			Returns(200, "ok", ""))
	apiV1Ws.Route(
		apiV1Ws.GET("/servicemesh/nodegraphs").
			To(apiHandler.handleGetNodeGraph).
			Doc("get namespace service graph").
			Returns(200, "OK", servicegraph.Graph{}))
	//endregion

	apiV1Ws.Route(
		apiV1Ws.GET("/microservice/{namespace}/{name}").
			To(apiHandler.handleGetMicroserviceRelation).
			Doc("get microservice deployment and svc  relation"))

	apiV1Ws.Route(
		apiV1Ws.POST("/microservice/{namespace}/{name}/service").
			To(apiHandler.handleCreateMicroserviceSvc))

	apiV1Ws.Route(
		apiV1Ws.PUT("/microservice/{namespace}/{name}/service/{servicename}").
			To(apiHandler.handleUpdateMicroserviceSvc))

	// destinationrule
	apiV1Ws.Route(
		apiV1Ws.GET("/destinationrule/{namespace}").
			To(apiHandler.handleListDestinationRule).
			Doc("get namespace destination rule"),
	)
	apiV1Ws.Route(
		apiV1Ws.GET("/destinationrule/{namespace}/{name}").
			To(apiHandler.handleGetDestinationRuleDetail),
	)
	apiV1Ws.Route(
		apiV1Ws.GET("/destinationruleinfohost/{namespace}/{name}").
			To(apiHandler.handleGetDestinationRuleInfoHost),
	)
	apiV1Ws.Route(
		apiV1Ws.PUT("/destinationrule/{namespace}/{name}").
			To(apiHandler.handleUpdateDestinationRule))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/destinationrule/{namespace}/{name}").
			To(apiHandler.handleDeleteDestinationRule),
	)

	// virtualservice
	apiV1Ws.Route(
		apiV1Ws.GET("/virtualservice/{namespace}").
			To(apiHandler.handleListVirtualService))
	apiV1Ws.Route(
		apiV1Ws.GET("/virtualservice/{namespace}/{name}").
			To(apiHandler.handleGetVirtualService))
	apiV1Ws.Route(
		apiV1Ws.GET("/virtualservicehost/{namespace}/{name}").
			To(apiHandler.handleGetVirtualServiceByHost))
	apiV1Ws.Route(
		apiV1Ws.POST("/virtualservice/{namespace}").
			To(apiHandler.handleCreateVirtualService),
	)
	apiV1Ws.Route(
		apiV1Ws.PUT("/virtualservice/{namespace}/{name}").
			To(apiHandler.handleUpdateVirtualService))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/virtualservice/{namespace}/{name}").
			To(apiHandler.handleDeleteVirtualService),
	)

	// Policy
	apiV1Ws.Route(
		apiV1Ws.GET("/policy/{namespace}").
			To(apiHandler.handleListPolicy))
	apiV1Ws.Route(
		apiV1Ws.GET("/policy/{namespace}/{name}").
			To(apiHandler.handleGetPolicy))
	apiV1Ws.Route(
		apiV1Ws.POST("/policy/{namespace}").
			To(apiHandler.handleCreatePolicy),
	)
	apiV1Ws.Route(
		apiV1Ws.PUT("/policy/{namespace}/{name}").
			To(apiHandler.handleUpdatePolicy))

	apiV1Ws.Route(
		apiV1Ws.DELETE("/policy/{namespace}/{name}").
			To(apiHandler.handleDeletePolicy),
	)

	apiV1Ws.Route(
		apiV1Ws.GET("/gateway/{namespace}").
			To(apiHandler.handleListGateways))
	apiV1Ws.Route(
		apiV1Ws.GET("/gateway/{namespace}/{name}").
			To(apiHandler.handleGetGateway))
	apiV1Ws.Route(
		apiV1Ws.POST("/gateway/{namespace}").
			To(apiHandler.handleCreateGateway))
	apiV1Ws.Route(
		apiV1Ws.PUT("/gateway/{namespace}/{name}").
			To(apiHandler.handleUpdateGateway))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/gateway/{namespace}/{name}").
			To(apiHandler.handleDeleteGateway))
	apiV1Ws.Route(
		apiV1Ws.GET("/asmclusterconfig/{name}").
			To(apiHandler.handleGetASMClusterConfig))
	apiV1Ws.Route(
		apiV1Ws.PUT("/asmclusterconfig/{name}").
			To(apiHandler.handleUpdateASMClusterConfig))
	// endregion

	apiV1Ws.Route(
		apiV1Ws.POST("/artifactregistrymanagers").
			To(apiHandler.handleCreateArtifactRegistryManager).
			Writes(artifactregistrymanager.ArtifactRegistryManager{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/artifactregistrymanagers/{name}").
			To(apiHandler.handleDeleteArtifactRegistryManager).
			Writes(artifactregistrymanager.ArtifactRegistryManager{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/artifactregistrymanagers/{name}").
			To(apiHandler.handleUpdateArtifactRegistryManager).
			Writes(v1alpha1.ArtifactRegistryManager{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/artifactregistrymanagers").
			To(apiHandler.handleGetArtifactRegistryManagerList).
			Writes(artifactregistrymanager.ArtifactRegistryManagerList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/artifactregistrymanagers/{name}").
			To(apiHandler.handleGetArtifactRegistryManagerDetail).
			Writes(v1alpha1.ArtifactRegistryManager{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/artifactregistries").
			To(apiHandler.handleCreateArtifactRegistry).
			Writes(artifactregistry.ArtifactRegistry{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/artifactregistries/{name}").
			To(apiHandler.handleDeleteArtifactRegistry).
			Writes(artifactregistry.ArtifactRegistry{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/artifactregistries/{name}").
			To(apiHandler.handleUpdateArtifactRegistry).
			Writes(v1alpha1.ArtifactRegistry{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/artifactregistries").
			To(apiHandler.handleGetArtifactRegistryList).
			Writes(artifactregistry.ArtifactRegistryList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/artifactregistries/{name}").
			To(apiHandler.handleGetArtifactRegistryDetail).
			Writes(v1alpha1.ArtifactRegistry{}))

	apiV1Ws.Route(
		apiV1Ws.POST("/artifactregistrybindings").
			To(apiHandler.handleCreateArtifactRegistryBinding).
			Writes(artifactregistrybinding.ArtifactRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.POST("/artifactregistrybindings/{namespace}").
			To(apiHandler.handleCreateArtifactRegistryBinding).
			Writes(artifactregistrybinding.ArtifactRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/artifactregistrybindings/{namespace}/{name}").
			To(apiHandler.handleDeleteArtifactRegistryBinding).
			Writes(artifactregistrybinding.ArtifactRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.PUT("/artifactregistrybindings/{namespace}/{name}").
			To(apiHandler.handleUpdateArtifactRegistryBinding).
			Writes(v1alpha1.ArtifactRegistryBinding{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/artifactregistrybindings/{namespace}").
			To(apiHandler.handleGetArtifactRegistryBindingList).
			Writes(artifactregistrybinding.ArtifactRegistryBindingList{}))
	apiV1Ws.Route(
		apiV1Ws.GET("/artifactregistrybindings/{namespace}/{name}").
			To(apiHandler.handleGetArtifactRegistryBindingDetail).
			Writes(v1alpha1.ArtifactRegistryBinding{}))

	//common route
	apiV1Ws.Route(
		apiV1Ws.POST("/common/{resource}").
			To(apiHandler.handlePostCommonResource).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/common/{resource}/{name}").
			To(apiHandler.handleDeleteCommonResource).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.PUT("/common/{resource}/{name}").
			To(apiHandler.handlePutCommonResource).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.GET("/common/{resource}").
			To(apiHandler.handleGetCommonResourceList).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.GET("/common/{resource}/{name}").
			To(apiHandler.handleGetCommonResource).
			Writes(make(map[string]interface{})))

	apiV1Ws.Route(
		apiV1Ws.POST("/common/namespace/{namespace}/{resource}").
			To(apiHandler.handlePostCommonResource).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.DELETE("/common/namespace/{namespace}/{resource}/{name}").
			To(apiHandler.handleDeleteCommonResource).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.PUT("/common/namespace/{namespace}/{resource}/{name}").
			To(apiHandler.handlePutCommonResource).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.GET("/common/namespace/{namespace}/{resource}").
			To(apiHandler.handleGetCommonResourceList).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.GET("/common/namespace/{namespace}/{resource}/{name}").
			To(apiHandler.handleGetCommonResource).
			Writes(make(map[string]interface{})))

	apiV1Ws.Route(
		apiV1Ws.GET("/common/{resource}/{name}/sub/{sub}").
			To(apiHandler.handleGetCommonResourceSub).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.POST("/common/{resource}/{name}/sub/{sub}").
			To(apiHandler.handlePostCommonResourceSub).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.GET("/common/namespace/{namespace}/{resource}/{name}/sub/{sub}").
			To(apiHandler.handleGetCommonResourceSub).
			Writes(make(map[string]interface{})))
	apiV1Ws.Route(
		apiV1Ws.POST("/common/namespace/{namespace}/{resource}/{name}/sub/{sub}").
			To(apiHandler.handlePostCommonResourceSub).
			Writes(make(map[string]interface{})))

	AddAppCoreUrl(apiV1Ws, apiHandler)
	return wsContainer, nil
}

const (
	URLProjectManagementDetails        = "/projectmanagement/{name}"
	URLProjectManagementBindingDetails = "/projectmanagementbinding/{namespace}/{name}"
	URLTestToolDetails                 = "/testtool/{name}"
	URLTestToolBindingDetails          = "/testtoolbinding/{namespace}/{name}"
	URLIMAGEREGISTRYBINDINGDETAIL      = "/imageregistrybinding/{namespace}/{name}"
	URLCODEQUALITYTOOLDETAIL           = "/codequalitytool/{name}"
)
