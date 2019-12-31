package handler

import (
	"fmt"
	"net/http"
	"strings"

	clientapi "alauda.io/diablo/src/backend/client/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/other"
	"github.com/emicklei/go-restful"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

func (apiHandler *APIHandler) handleOtherResourcesList(request *restful.Request, response *restful.Response) {
	dataSelect := parseDataSelectPathParameter(request)

	if isNoOrderSearchQuery(dataSelect) {
		// set order by name length to make best matches come first
		dataSelect.SortQuery.SortByList = []dataselect.SortBy{
			{Property: dataselect.NameLengthProperty, Ascending: true},
			{Property: dataselect.CreationTimestampProperty, Ascending: false},
		}
	}

	result, err := other.GetAllResourceList(apiHandler.cManager, request, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// check if query sort by name and no order query
func isNoOrderSearchQuery(query *dataselect.DataSelectQuery) bool {
	return len(query.SortQuery.SortByList) == 0 &&
		len(query.FilterQuery.FilterByList) == 1 &&
		query.FilterQuery.FilterByList[0].Property == dataselect.NameProperty
}

func (apiHandler *APIHandler) handleOtherResourceDetail(request *restful.Request, response *restful.Response) {
	group := request.PathParameter("group")
	version := request.PathParameter("version")
	kind := request.PathParameter("kind")
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resourceName, err := getKindName(k8sClient, kind)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resource := &v1.APIResource{
		Name:       resourceName,
		Kind:       kind,
		Group:      group,
		Version:    version,
		Namespaced: true,
	}

	if group == "_" {
		group = ""
	}
	if namespace == "_" {
		namespace = ""
		resource.Namespaced = false
	}
	dynamicClient, err := apiHandler.cManager.DynamicClient(request, &schema.GroupVersionKind{Group: group, Version: version, Kind: kind})
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	switch method := request.Request.Method; method {
	case http.MethodGet:
		result, err := other.GetResourceDetail(dynamicClient, k8sClient, namespace, name)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		response.WriteHeaderAndEntity(http.StatusOK, result)
		return
	case http.MethodDelete:
		err := other.DeleteResource(dynamicClient, resource, namespace, name)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		response.WriteHeader(http.StatusOK)
		return
	case http.MethodPut:
		payload := unstructured.Unstructured{}
		err := request.ReadEntity(&payload)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		err = other.UpdateResource(dynamicClient, namespace, name, &payload)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
		response.WriteHeader(http.StatusOK)
		return
	default:
		kdErrors.HandleInternalError(response, fmt.Errorf("method %s not allowed", method))
	}
}

func (apiHandler *APIHandler) handleOtherResourcePatch(request *restful.Request, response *restful.Response) {
	field := request.PathParameter("field")
	fieldPayload := other.FieldPayload{}
	if field == "labels" || field == "annotations" {
		err := request.ReadEntity(&fieldPayload)
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
	}

	group := request.PathParameter("group")
	version := request.PathParameter("version")
	kind := request.PathParameter("kind")
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	k8sClient, err := apiHandler.cManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resourceName, err := getKindName(k8sClient, kind)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	resource := &v1.APIResource{
		Name:       resourceName,
		Kind:       kind,
		Group:      group,
		Version:    version,
		Namespaced: true,
	}

	if group == "_" {
		group = ""
	}
	if namespace == "_" {
		namespace = ""
		resource.Namespaced = false
	}

	dynamicClient, err := apiHandler.cManager.DynamicClient(request, &schema.GroupVersionKind{Group: group, Version: version, Kind: kind})
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	err = other.PatchResource(dynamicClient, namespace, name, field, &fieldPayload)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeader(http.StatusOK)
	return
}

type CreateMessage struct {
	Success  bool   `json:"success" description:"if resource create success"`
	Resource string `json:"resource" description:"resource name in format {kind} {name}"`
	Message  string `json:"message" description:"if create failed return failed reason"`
}

type CreateResponse struct {
	CreateMessages       []CreateMessage `json:"create_messages"`
	TotalResourceCount   int             `json:"total_resource_count"`
	SuccessResourceCount int             `json:"success_resource_count"`
	FailedResourceCount  int             `json:"failed_resource_count"`
}

func (apiHandler *APIHandler) handleOtherResourceCreate(request *restful.Request, response *restful.Response) {
	payload := []unstructured.Unstructured{}
	err := request.ReadEntity(&payload)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	messages := make([]CreateMessage, 0, len(payload))
	var successResourceCount, failedResourceCount int
	totalResourceCount := len(payload)
	for _, r := range payload {
		err := CreateResource(r, apiHandler.cManager, request)
		if err != nil {
			messages = append(messages, CreateMessage{Success: false, Resource: fmt.Sprintf("%s %s", r.GetKind(), r.GetName()), Message: err.Error()})
			failedResourceCount += 1
		} else {
			messages = append(messages, CreateMessage{Success: true, Resource: fmt.Sprintf("%s %s", r.GetKind(), r.GetName())})
			successResourceCount += 1
		}
	}

	response.WriteHeaderAndEntity(http.StatusOK,
		CreateResponse{
			CreateMessages:       messages,
			TotalResourceCount:   totalResourceCount,
			SuccessResourceCount: successResourceCount,
			FailedResourceCount:  failedResourceCount})
	return
}

func CreateResource(raw unstructured.Unstructured, cm clientapi.ClientManager, request *restful.Request) error {
	kind := raw.GetKind()
	k8sClient, err := cm.Client(request)
	if err != nil {
		return err
	}
	resourceName, err := getKindName(k8sClient, kind)
	if err != nil {
		return err
	}
	resource := &v1.APIResource{
		Name: resourceName,
		Kind: kind,
	}

	if raw.GetNamespace() != "" {
		resource.Namespaced = true
	}
	var group, version string
	gv := strings.Split(raw.GetAPIVersion(), "/")
	if len(gv) == 1 {
		group, version = "", gv[0]
	} else {
		group, version = gv[0], gv[1]
	}

	dynamicClient, err := cm.DynamicClient(request, &schema.GroupVersionKind{Group: group, Version: version, Kind: kind})
	if err != nil {
		return err
	}

	err = other.CreateResource(dynamicClient, raw.GetNamespace(), &raw)
	return err
}

func getKindName(client kubernetes.Interface, kind string) (string, error) {
	return other.GetKindName(client, kind)
	// if name, ok := other.KindToName[kind]; ok {
	// 	return name, nil
	// }

	// if _, err := other.GetCanListResource(client); err != nil {
	// 	return "", err
	// }

	// if name, ok := other.KindToName[kind]; ok {
	// 	return name, nil
	// }
	// return "", fmt.Errorf("kind %s not find in kubernetes server", kind)
}
