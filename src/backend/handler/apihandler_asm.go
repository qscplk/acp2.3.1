package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	asmapi "alauda.io/asm-controller/pkg/apis/asm/v1beta1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	authApi "alauda.io/diablo/src/backend/auth/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/asmConfig"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/destinationrule"
	"alauda.io/diablo/src/backend/resource/gateway"
	"alauda.io/diablo/src/backend/resource/microservice"
	"alauda.io/diablo/src/backend/resource/policy"
	"alauda.io/diablo/src/backend/resource/servicegraph"
	"alauda.io/diablo/src/backend/resource/virtualservice"
	"github.com/emicklei/go-restful"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	PathParameterStartTime = "start_time"
	// PathParameterEndTime is the path parameter end_time
	PathParameterEndTime            = "end_time"
	PathParameterStep               = "step"
	PathParameterService            = "service"
	PathParameterWorkload           = "workload"
	PathParameterApp                = "app"
	PathParameterVersion            = "version"
	PathParameterSourceNamespace    = "source_namespace"
	PathParameterSourceWorkload     = "source_workload"
	PathParameterSourceService      = "source_service"
	PathParameterTargetNamespace    = "target_namespace"
	PathParameterTargetWorkload     = "target_workload"
	PathParameterTargetService      = "target_service"
	PathParameterInjectServiceNodes = "inject_service_nodes"

	PathParameterSelectedNamespace = "selected_namespace"

	HeadParameterAuthorization = "Authorization"
	ResponseOKMessage          = "ok"
	DestinationtuleAll         = "0"

	DefaultInjectServiceNodes = false
)

func (apiHandler *APIHandler) handleGetNamespaceGraph(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dyclient, err := apiHandler.cManager.DynamicClient(request, &asmConfig.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	clusterName := request.PathParameter("cluster")
	if clusterName == "" {
		clusterName = request.QueryParameter("cluster")
	}

	clusterConf, err := asmConfig.GetClusterConfig(dyclient, clusterName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	p8sUrl := clusterConf.Spec.PrometheusURL
	namespace := request.PathParameter(PathParameterNamespace)
	startTime, err := strconv.Atoi(request.QueryParameter(PathParameterStartTime))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid timestamp", request.QueryParameter(PathParameterStartTime)))
		return
	}
	endTime, err := strconv.Atoi(request.QueryParameter(PathParameterEndTime))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid duration", request.QueryParameter(PathParameterEndTime)))
		return
	}
	injectServiceNodesString := request.QueryParameter(PathParameterInjectServiceNodes)
	var injectServiceNodes bool
	if injectServiceNodesString == "" {
		injectServiceNodes = DefaultInjectServiceNodes
	} else {
		var injectServiceNodesErr error
		injectServiceNodes, injectServiceNodesErr = strconv.ParseBool(injectServiceNodesString)
		if injectServiceNodesErr != nil {
			kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid injectServiceNodes", request.QueryParameter(PathParameterEndTime)))
			return
		}
	}

	result, err := servicegraph.GetGraph(k8sClient, namespace, startTime, endTime, injectServiceNodes, p8sUrl)
	if err != nil {

		//fmt.Printf("servicegraph get graph error %s", err)
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetMetrics(request *restful.Request, response *restful.Response) {
	dyclient, err := apiHandler.cManager.DynamicClient(request, &asmConfig.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	clusterName := request.PathParameter("cluster")
	if clusterName == "" {
		clusterName = request.QueryParameter("cluster")
	}

	clusterConf, err := asmConfig.GetClusterConfig(dyclient, clusterName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	p8sUrl := clusterConf.Spec.PrometheusURL

	startTime, err := strconv.Atoi(request.QueryParameter(PathParameterStartTime))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid timestamp", request.QueryParameter(PathParameterStartTime)))
		return
	}
	endTime, err := strconv.Atoi(request.QueryParameter(PathParameterEndTime))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid duration", request.QueryParameter(PathParameterEndTime)))
		return
	}
	step, err := strconv.Atoi(request.QueryParameter(PathParameterStep))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid step", request.QueryParameter(PathParameterStep)))
		return
	}
	if step == 0 {
		step = 60
	}

	if request.QueryParameter(PathParameterService) != "" {
		namespace := request.QueryParameter(PathParameterNamespace)
		if namespace == "" {
			kdErrors.HandleInternalError(response, fmt.Errorf("namespace is empty"))
			return
		}
		workload := request.QueryParameter(PathParameterWorkload)
		metrics, err := servicegraph.GetServiceMetrics(namespace, request.QueryParameter(PathParameterService), workload, startTime, endTime, step, p8sUrl)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		response.WriteHeaderAndEntity(http.StatusOK, metrics)
		return
	}

	if request.QueryParameter(PathParameterWorkload) != "" {
		namespace := request.QueryParameter(PathParameterNamespace)
		if namespace == "" {
			kdErrors.HandleInternalError(response, fmt.Errorf("namespace is empty"))
			return
		}
		metrics, err := servicegraph.GetWorkloadMetrics(namespace, request.QueryParameter(PathParameterWorkload), startTime, endTime, step, p8sUrl)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		response.WriteHeaderAndEntity(http.StatusOK, metrics)
		return
	}

	sourceNamespace := request.QueryParameter(PathParameterSourceNamespace)
	sourceWorkload := request.QueryParameter(PathParameterSourceWorkload)
	sourceService := request.QueryParameter(PathParameterSourceService)
	targetNamespace := request.QueryParameter(PathParameterTargetNamespace)
	targetWorkload := request.QueryParameter(PathParameterTargetWorkload)
	targetService := request.QueryParameter(PathParameterTargetService)
	if (sourceWorkload == "" && sourceService == "") || targetNamespace == "" || (targetWorkload == "" && targetService == "") {
		kdErrors.HandleInternalError(response, fmt.Errorf("missing paramater source_namespace/source_workload/target_namespace/target_workload"))
		return
	}

	edgQueryOptions := &servicegraph.EdgeMetricsQueryOptions{
		SourceNamespace: sourceNamespace,
		SourceWorkload:  sourceWorkload,
		SourceService:   sourceService,
		TargetNamespace: targetNamespace,
		TargetWorkload:  targetWorkload,
		TargetService:   targetService,
		StartTime:       startTime,
		EndTime:         endTime,
		Step:            step,
		MetricsType:     servicegraph.NODE_EDGE_TYPE,
		P8sURL:          p8sUrl,
	}
	metrics, err := servicegraph.GetEdgeMetrics(edgQueryOptions)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, metrics)
}

//get microservice relation
func (apiHandler *APIHandler) handleGetMicroserviceRelation(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dsQuery := parseDataSelectPathParameter(request)

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dyclient, err := apiHandler.cManager.DynamicClient(request, &microservice.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	rule, err := microservice.GetMicroServiceRelationDetail(k8sClient, dyclient, dsQuery, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, rule)
}

//create microservice asm svc
func (apiHandler *APIHandler) handleCreateMicroserviceSvc(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dyclient, err := apiHandler.cManager.DynamicClient(request, &microservice.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	msname := request.PathParameter(PathParameterName)
	spec := new(corev1.Service)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := microservice.CreateMicroServiceSvc(k8sClient, dyclient, namespace, msname, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

//update ms svc
func (apiHandler *APIHandler) handleUpdateMicroserviceSvc(request *restful.Request, response *restful.Response) {
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter(PathParameterNamespace)
	msname := request.PathParameter(PathParameterName)
	svcname := request.PathParameter(PathParameterServiceName)
	spec := new(corev1.Service)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := microservice.UpdateMicroServiceSvc(k8sClient, namespace, msname, svcname, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusAccepted, result)
}

// get DestinationRule List filter by  namespace
func (apiHandler *APIHandler) handleListDestinationRule(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	policyType := request.QueryParameter(PolicyType)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &destinationrule.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	var dsQuery *dataselect.DataSelectQuery
	if policyType == "" {
		policyType = DestinationtuleAll
		dsQuery = nil
	} else {
		dsQuery = parseDataSelectPathParameter(request)
	}
	list, err := destinationrule.GetDestinationRuleList(dyclient, namespace, policyType, dsQuery)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, list)
}

// get DestinationRule detail filter by  namespace and name
func (apiHandler *APIHandler) handleGetDestinationRuleDetail(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &destinationrule.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	rule, err := destinationrule.GetDestinationRuleDetail(dyclient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, rule)
}

// get DestinationRule detail filter by  namespace and name
func (apiHandler *APIHandler) handleGetDestinationRuleInfoHost(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	hostName := request.PathParameter(PathParameterName)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &destinationrule.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	rules, err := destinationrule.GetDestinationRuleByHostDetail(dyclient, namespace, hostName)
	if rules == nil && err != nil {
		response.WriteHeaderAndEntity(http.StatusNotFound, hostName)
		return
	}
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, rules)
}

func (apiHandler *APIHandler) handleUpdateDestinationRule(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &destinationrule.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	destinationRule := &unstructured.Unstructured{}
	if err := request.ReadEntity(destinationRule); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	var result *unstructured.Unstructured
	if result, err = destinationrule.UpdateDestinationRule(dyclient, namespace, name, destinationRule); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)

}

func (apiHandler *APIHandler) handleDeleteDestinationRule(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &destinationrule.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if err = destinationrule.DeleteDestinationRule(dyclient, namespace, name); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, "ok")
}

// add/delete/update VirtualService filters by  namespace and name
func (apiHandler *APIHandler) handleListVirtualService(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &virtualservice.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	dataSelect := parseDataSelectPathParameter(request)
	list, err := virtualservice.GetVirtualServiceList(dyclient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, list)

}

func (apiHandler *APIHandler) handleGetVirtualService(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &virtualservice.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	rule, err := virtualservice.GetVirtualServiceDetail(dyclient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, rule)
}

func (apiHandler *APIHandler) handleGetVirtualServiceByHost(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &virtualservice.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	rule, err := virtualservice.GetVirtualServiceDetailByHost(dyclient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, rule)
}

func parseUser(request *restful.Request) (*authApi.JWEToken, error) {
	authHeader := request.HeaderParameter(HeadParameterAuthorization)
	var id_token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		id_token = strings.TrimPrefix(authHeader, "Bearer ")
	}
	return authApi.ParseJWT(id_token)
}

func (apiHandler *APIHandler) handleCreateVirtualService(request *restful.Request, response *restful.Response) {

	namespace := request.PathParameter(PathParameterNamespace)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &virtualservice.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	vs := &unstructured.Unstructured{}
	if err := request.ReadEntity(vs); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	jweToken, err := parseUser(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	var result *unstructured.Unstructured
	if result, err = virtualservice.CreateVirtualService(dyclient, namespace, jweToken.Name, vs); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateVirtualService(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &virtualservice.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	vs := &unstructured.Unstructured{}
	if err := request.ReadEntity(vs); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	var result *unstructured.Unstructured
	if result, err = virtualservice.UpdateVirtualService(dyclient, namespace, name, vs); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)

}

func (apiHandler *APIHandler) handleDeleteVirtualService(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &virtualservice.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if err = virtualservice.DeleteVirtualService(dyclient, namespace, name); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, ResponseOKMessage)
}

func (apiHandler *APIHandler) handleListPolicy(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &policy.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	dataSelect := parseDataSelectPathParameter(request)
	list, err := policy.GetPolicyList(dyclient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, list)

}

func (apiHandler *APIHandler) handleGetPolicy(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &policy.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	rule, err := policy.GetPolicyDetail(dyclient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, rule)
}

func (apiHandler *APIHandler) handleCreatePolicy(request *restful.Request, response *restful.Response) {

	namespace := request.PathParameter(PathParameterNamespace)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &policy.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	usPolicy := &unstructured.Unstructured{}
	if err := request.ReadEntity(usPolicy); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	jweToken, err := parseUser(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	var result *unstructured.Unstructured
	if result, err = policy.CreatePolicy(dyclient, namespace, jweToken.Name, usPolicy); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdatePolicy(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &policy.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	usPolicy := &unstructured.Unstructured{}
	if err := request.ReadEntity(usPolicy); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	var result *unstructured.Unstructured
	if result, err = policy.UpdatePolicy(dyclient, namespace, name, usPolicy); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)

}

func (apiHandler *APIHandler) handleDeletePolicy(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &policy.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if err = policy.DeletePolicy(dyclient, namespace, name); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, ResponseOKMessage)
}

func (apiHandler *APIHandler) handleListGateways(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &gateway.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	dataSelect := parseDataSelectPathParameter(request)
	list, err := gateway.GetGatewayList(dyclient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, list)

}

func (apiHandler *APIHandler) handleGetGateway(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)

	dyclient, err := apiHandler.cManager.DynamicClient(request, &gateway.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	gateWay, err := gateway.GetGatewayDetail(dyclient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, gateWay)
}

func (apiHandler *APIHandler) handleCreateGateway(request *restful.Request, response *restful.Response) {

	namespace := request.PathParameter(PathParameterNamespace)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &gateway.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	usGateway := &unstructured.Unstructured{}
	if err := request.ReadEntity(usGateway); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	jweToken, err := parseUser(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	var result *unstructured.Unstructured
	if result, err = gateway.CreateGateway(dyclient, namespace, jweToken.Name, usGateway); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleUpdateGateway(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &gateway.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	usGateway := &unstructured.Unstructured{}
	if err := request.ReadEntity(usGateway); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	var result *unstructured.Unstructured
	if result, err = gateway.UpdateGateway(dyclient, namespace, name, usGateway); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)

}

func (apiHandler *APIHandler) handleDeleteGateway(request *restful.Request, response *restful.Response) {
	namespace := request.PathParameter(PathParameterNamespace)
	name := request.PathParameter(PathParameterName)
	dyclient, err := apiHandler.cManager.DynamicClient(request, &gateway.GVK)

	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if err = gateway.DeleteGateway(dyclient, namespace, name); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, ResponseOKMessage)
}

func (apiHandler *APIHandler) handleGetASMClusterConfig(request *restful.Request, response *restful.Response) {

	asmClient, err := apiHandler.cManager.ASMClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	name := request.PathParameter(PathParameterName)
	clusterconfig, err := asmClient.ClusterConfigs().Get(name, v1.GetOptions{})
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, clusterconfig)
}

func (apiHandler *APIHandler) handleUpdateASMClusterConfig(request *restful.Request, response *restful.Response) {
	asmClient, err := apiHandler.cManager.ASMClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	name := request.PathParameter(PathParameterName)
	clusterconfig := &asmapi.ClusterConfig{}
	err = request.ReadEntity(clusterconfig)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	clusterconfig.Name = name
	if clusterconfig, err = asmClient.ClusterConfigs().Update(clusterconfig); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, clusterconfig)
}

func (apiHandler *APIHandler) handleGetNodeGraph(request *restful.Request, response *restful.Response) {
	dyclient, err := apiHandler.cManager.DynamicClient(request, &asmConfig.GVK)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	clusterName := request.PathParameter("cluster")
	if clusterName == "" {
		clusterName = request.QueryParameter("cluster")
	}

	clusterConf, err := asmConfig.GetClusterConfig(dyclient, clusterName)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	p8sUrl := clusterConf.Spec.PrometheusURL
	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	namespace := request.QueryParameter(PathParameterNamespace)
	workload := request.QueryParameter(PathParameterWorkload)
	service := request.QueryParameter(PathParameterService)

	app := request.QueryParameter(PathParameterApp)
	version := request.QueryParameter(PathParameterVersion)

	if namespace == "" || (workload == "" && service == "") {
		kdErrors.HandleInternalError(response, fmt.Errorf("missing paramater namespace/workload/service"))
		return
	}

	selectedNamespace := request.QueryParameter(PathParameterSelectedNamespace)

	if selectedNamespace == "" {
		selectedNamespace = namespace
	}

	startTime, err := strconv.Atoi(request.QueryParameter(PathParameterStartTime))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid timestamp", request.QueryParameter(PathParameterStartTime)))
		return
	}
	endTime, err := strconv.Atoi(request.QueryParameter(PathParameterEndTime))
	if err != nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid duration", request.QueryParameter(PathParameterEndTime)))
		return
	}

	injectServiceNodesString := request.QueryParameter(PathParameterInjectServiceNodes)
	var injectServiceNodes bool
	if injectServiceNodesString == "" {
		injectServiceNodes = DefaultInjectServiceNodes
	} else {
		var injectServiceNodesErr error
		injectServiceNodes, injectServiceNodesErr = strconv.ParseBool(injectServiceNodesString)
		if injectServiceNodesErr != nil {
			kdErrors.HandleInternalError(response, fmt.Errorf("%s is not a valid injectServiceNodes", request.QueryParameter(PathParameterEndTime)))
			return
		}
	}

	result, err := servicegraph.GetNodeGraph(k8sClient, namespace, workload, app, version, service, selectedNamespace, startTime, endTime, injectServiceNodes, p8sUrl)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
