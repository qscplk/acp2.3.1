package handler

import (
	"net/http"

	"github.com/emicklei/go-restful"
	"github.com/golang/glog"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/coderepobinding"
	"alauda.io/diablo/src/backend/resource/codereposervice"
	"alauda.io/diablo/src/backend/resource/coderepository"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/secret"
)

func (apiHandler *APIHandler) handleCreateCodeRepoService(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.CodeRepoService)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := codereposervice.CreateCodeRepoService(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteCodeRepoService(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	err = codereposervice.DeleteCodeRepoService(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateCodeRepoService(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	spec := new(v1alpha1.CodeRepoService)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := codereposervice.UpdateCodeRepoService(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoServiceDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := codereposervice.GetCodeRepoService(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoServiceList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := codereposervice.GetCodeRepoServiceList(devopsClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoServiceResourceList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := parseNamespacePathParameter(request)
	dsQuery := dataselect.GeSimpleLabelQuery(dataselect.CodeRepoServiceProperty, name)
	result, err := coderepository.GetResourceListByCodeRepository(devopsClient, namespace, dsQuery)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoServiceSecretList(request *restful.Request, response *restful.Response) {
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

	name := request.PathParameter("name")
	namespace := parseNamespacePathParameter(request)
	bindingQuery := dataselect.GeSimpleLabelQuery(dataselect.CodeRepoServiceProperty, name)
	bindingList, err := coderepobinding.GetCodeRepoBindingList(devopsClient, namespace, bindingQuery)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	secretQuery := parseDataSelectPathParameter(request)
	secretList, err := secret.GetSecretList(k8sClient, appCoreClient, namespace, secretQuery, false)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	var secrets []secret.Secret
	for _, binding := range bindingList.Items {
		for _, se := range secretList.Secrets {
			if binding.Spec.Account.Secret.Name == se.ObjectMeta.Name && binding.ObjectMeta.Namespace == se.ObjectMeta.Namespace {
				secrets = append(secrets, se)
			}
		}
	}

	result := secret.SecretList{
		ListMeta: api.ListMeta{TotalItems: len(secrets)},
		Secrets:  secrets,
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleCreateCodeRepoBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")

	binding := new(v1alpha1.CodeRepoBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	authorizeResponse, err := codereposervice.AuthorizeService(devopsClient,
		binding.Spec.CodeRepoService.Name, binding.GetSecretName(), binding.GetSecretNamespace())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if authorizeResponse != nil && authorizeResponse.AuthorizeUrl != "" {
		response.WriteHeaderAndEntity(http.StatusPreconditionRequired, authorizeResponse)
		return
	}

	result, err := coderepobinding.CreateCodeRepoBinding(devopsClient, binding, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteCodeRepoBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = coderepobinding.DeleteCodeRepoBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateCodeRepoBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")

	binding := new(v1alpha1.CodeRepoBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	glog.V(5).Infof("verify secret %s/%s for service %s",
		binding.GetSecretNamespace(), binding.GetSecretName(), binding.Spec.CodeRepoService.Name)
	authorizeResponse, err := codereposervice.AuthorizeService(
		devopsClient, binding.Spec.CodeRepoService.Name, binding.GetSecretName(), binding.GetSecretNamespace())
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	if authorizeResponse != nil && authorizeResponse.AuthorizeUrl != "" {
		response.WriteHeaderAndEntity(http.StatusPreconditionRequired, authorizeResponse)
		return
	}

	oldBinding, err := coderepobinding.GetCodeRepoBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	_, err = coderepobinding.UpdateCodeRepoBinding(devopsClient, oldBinding, binding)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	newBinding, err := coderepobinding.GetCodeRepoBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	result := coderepository.GetResourcesReferToRemovedRepos(devopsClient, oldBinding, newBinding)
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoBindingDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := coderepobinding.GetCodeRepoBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoBindingList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := coderepobinding.GetCodeRepoBindingList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepositoryList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := coderepository.GetCodeRepositoryList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepositoryListInBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := coderepository.GetCodeRepositoryListInBinding(devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoBindingSecretList(request *restful.Request, response *restful.Response) {
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
	binding, err := coderepobinding.GetCodeRepoBinding(devopsClient, namespace, name)
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
		if binding.Spec.Account.Secret.Name == se.ObjectMeta.Name && binding.ObjectMeta.Namespace == se.ObjectMeta.Namespace {
			secrets = append(secrets, se)
			break
		}
	}

	result := secret.SecretList{
		ListMeta: api.ListMeta{TotalItems: 1},
		Secrets:  secrets,
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetRemoteRepositoryList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := coderepobinding.GetRemoteRepositoryList(devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetCodeRepoServiceResources(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := codereposervice.GetCodeRepoServiceResources(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
	return
}

func (apiHandler *APIHandler) handleGetCodeRepoBindingResources(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := parseNamespacePathParameter(request)
	dsQuery := dataselect.GeSimpleLabelQuery(dataselect.CodeRepoBindingProperty, name)
	result, err := coderepository.GetResourceListByCodeRepository(devopsClient, namespace, dsQuery)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) HandleGetCodeRepositoryBranches(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	sortBy := request.QueryParameter("sortBy")
	sortMode := request.QueryParameter("sortMode")

	result, err := coderepository.GetCodeRepositoryBranches(devopsClient, namespace, name, sortBy, sortMode)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
