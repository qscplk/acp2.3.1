package handler

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/codequalitybinding"
	"alauda.io/diablo/src/backend/resource/codequalityproject"
	"alauda.io/diablo/src/backend/resource/codequalitytool"
	"github.com/emicklei/go-restful"
	"github.com/golang/glog"
	"net/http"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/secret"
)

// region CodeQualityTool
func (apiHandler *APIHandler) handleCreateCodeQualityTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	spec := new(v1alpha1.CodeQualityTool)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := codequalitytool.CreateCodeQualityTool(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteCodeQualityTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	name := request.PathParameter(PATH_NAME)
	err = codequalitytool.DeleteCodeQualityTool(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateCodeQualityTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	name := request.PathParameter(PATH_NAME)
	spec := new(v1alpha1.CodeQualityTool)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := codequalitytool.UpdateCodeQualityTool(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeQualityTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter(PATH_NAME)
	result, err := codequalitytool.GetCodeQualityTool(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleListCodeQualityTool(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := codequalitytool.ListCodeQualityTool(devopsClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateCodeQualityBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	binding := new(v1alpha1.CodeQualityBinding)

	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	authorizeResponse, err := codequalitytool.AuthorizeService(devopsClient, binding.Spec.CodeQualityTool.Name, binding.GetSecretName(), binding.GetSecretNamespace())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if authorizeResponse != nil && authorizeResponse.AuthorizeUrl != "" {
		response.WriteHeaderAndEntity(http.StatusPreconditionRequired, authorizeResponse)
		return
	}

	result, err := codequalitybinding.CreateCodeQualityBinding(devopsClient, binding, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleUpdateCodeQualityBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	binding := new(v1alpha1.CodeQualityBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	glog.V(5).Infof("verify secret %s/%s for tool %s",
		binding.GetSecretNamespace(), binding.GetSecretName(), binding.Spec.CodeQualityTool.Name)
	authorizeResponse, err := codequalitytool.AuthorizeService(devopsClient,
		binding.Spec.CodeQualityTool.Name, binding.GetSecretName(), binding.GetSecretNamespace())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if authorizeResponse != nil && authorizeResponse.AuthorizeUrl != "" {
		response.WriteHeaderAndEntity(http.StatusPreconditionRequired, authorizeResponse)
		return
	}

	oldBinding, err := codequalitybinding.GetCodeQualityBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	newBinding, err := codequalitybinding.UpdateCodeQualityBinding(devopsClient, oldBinding, binding)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, newBinding)
}

func (apiHandler *APIHandler) handleGetCodeQualityBindingList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := codequalitybinding.GetCodeQualityBindingList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeQualityBindingDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := codequalitybinding.GetCodeQualityBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleDeleteCodeQualityBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	err = codequalitybinding.DeleteCodeQualityBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeader(http.StatusNoContent)
}

func (apiHandler *APIHandler) handleGetCodeQualityProjectListInBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	result, err := codequalityproject.GetCodeQualityProjectListInBinding(devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeQualityBindingSecretList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	k8sClient, err := apiHandler.cManager.Client(nil)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	appCoreClient, err := apiHandler.cManager.AppCoreClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	binding, err := codequalitybinding.GetCodeQualityBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespaceQuery := common.NewSameNamespaceQuery(namespace)
	secretQuery := parseDataSelectPathParameter(request)
	secretList, err := secret.GetSecretList(k8sClient, appCoreClient, namespaceQuery, secretQuery, false)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	var secrets []secret.Secret
	for _, se := range secretList.Secrets {
		if binding.Spec.Secret.Name == se.ObjectMeta.Name && binding.ObjectMeta.Namespace == se.ObjectMeta.Namespace {
			secrets = append(secrets, se)
			break
		}
	}

	result := secret.SecretList{
		ListMeta: api.ListMeta{TotalItems: len(secrets)},
		Secrets:  secrets,
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateCodeQualityProject(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	spec := new(v1alpha1.CodeQualityProject)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := codequalityproject.CreateCodeQualityProject(devopsClient, spec, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)

}

func (apiHandler *APIHandler) handleUpdateCodeQualityProject(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	spec := new(v1alpha1.CodeQualityProject)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result, err := codequalityproject.UpdateCodeQualityProject(devopsClient, spec, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
func (apiHandler *APIHandler) handleGetCodeQualityProjectList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := codequalityproject.GetCodeQualityProjectList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeQualityProjectDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	result, err := codequalityproject.GetCodeQualityProject(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

// endregion
