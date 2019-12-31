package handler

import (
	"log"
	"net/http"
	"strings"
	"sync"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/imageregistry"
	"alauda.io/diablo/src/backend/resource/imageregistrybinding"
	"alauda.io/diablo/src/backend/resource/imagerepository"
	"alauda.io/diablo/src/backend/resource/secret"
	"github.com/emicklei/go-restful"
)

func (apiHandler *APIHandler) handleCreateImageRegistry(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	spec := new(v1alpha1.ImageRegistry)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := imageregistry.CreateImageRegistry(devopsClient, spec)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteImageRegsitry(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	err = imageregistry.DeleteImageRegistry(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateImageRegistry(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	spec := new(v1alpha1.ImageRegistry)
	if err := request.ReadEntity(spec); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	result, err := imageregistry.UpdateImageRegistry(devopsClient, spec, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRegistryDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	result, err := imageregistry.GetImageRegistry(devopsClient, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRegistryList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	result, err := imageregistry.GetImageRegistryList(devopsClient, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRegistrySecretList(request *restful.Request, response *restful.Response) {
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
	bindingQuery := dataselect.GeSimpleLabelQuery(dataselect.ImageRegistryProperty, name)
	bindingList, err := imageregistrybinding.GetImageRegistryBindingList(devopsClient, namespace, bindingQuery)
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
			if binding.Spec.Secret.Name == se.ObjectMeta.Name && binding.ObjectMeta.Namespace == se.ObjectMeta.Namespace {
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

func (apiHandler *APIHandler) handleCreateImageRegistryBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	binding := new(v1alpha1.ImageRegistryBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if binding.GetSecretName() != "" {
		_, err = imageregistry.AuthorizeService(devopsClient,
			binding.Spec.ImageRegistry.Name, binding.GetSecretName(), binding.GetSecretNamespace())
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
	}

	namespace := request.PathParameter("namespace")
	result, err := imageregistrybinding.CreateImageRegistryBinding(devopsClient, binding, namespace)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusCreated, result)
}

func (apiHandler *APIHandler) handleDeleteImageRegistryBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	err = imageregistrybinding.DeleteImageRegistryBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleUpdateImageRegistryBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	log.Println(request.PathParameters())

	binding := new(v1alpha1.ImageRegistryBinding)
	if err := request.ReadEntity(binding); err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	if binding.GetSecretName() != "" {
		_, err = imageregistry.AuthorizeService(devopsClient,
			binding.Spec.ImageRegistry.Name, binding.GetSecretName(), binding.GetSecretNamespace())
		if err != nil {
			kdErrors.HandleInternalError(response, err)
			return
		}
	}

	oldBinding, err := imageregistrybinding.GetImageRegistryBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	_, err = imageregistrybinding.UpdateImageRegistryBinding(devopsClient, oldBinding, binding)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, struct{}{})
}

func (apiHandler *APIHandler) handleGetImageRegistryBindingDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := imageregistrybinding.GetImageRegistryBinding(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRegistryBindingList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := parseNamespacePathParameter(request)
	dataSelect := parseDataSelectPathParameter(request)
	result, err := imageregistrybinding.GetImageRegistryBindingList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRepositoryList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := imagerepository.GetImageRepositoryList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

type VMap struct {
	vMap    map[string]map[string]string
	rwMutex sync.RWMutex
}

func (v *VMap) PushMainMap(key string, value map[string]string) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()
	v.vMap[key] = value

}

func (v *VMap) PushSubMap(key string, subKey string, subValue string) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()
	if _, ok := v.vMap[key]; !ok {
		v.vMap[key] = map[string]string{subKey: subValue}
	} else {
		v.vMap[key][subKey] = subValue
	}

}

func (v *VMap) GetMainMap(key string) (map[string]string, bool) {
	v.rwMutex.RLock()
	defer v.rwMutex.RUnlock()
	value, ok := v.vMap[key]

	return value, ok
}

//if exist return,else set
func (v *VMap) SetNXAndGetMainMap(key string, value map[string]string) (map[string]string, bool) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()
	var ok bool
	var resultValue map[string]string
	if resultValue, ok = v.vMap[key]; !ok {
		v.vMap[key] = value
	}

	return resultValue, ok
}

func (v *VMap) GetSubMap(key string, subKey string) (string, bool) {
	v.rwMutex.RLock()
	defer v.rwMutex.RUnlock()
	value, ok := v.vMap[key][subKey]

	return value, ok
}

func (v *VMap) SetNXAndGetSubMap(key string, subKey string, subValue string) (string, bool) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()
	var ok bool
	var resultSubValue string
	if resultSubValue, ok = v.vMap[key][subKey]; !ok {
		if _, ok := v.vMap[key]; !ok {
			v.vMap[key] = map[string]string{subKey: subValue}
		} else {
			v.vMap[key][subKey] = subValue
		}

	}

	return resultSubValue, ok
}

func (v *VMap) DelSubMap(key string, subKey string) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()

	delete(v.vMap[key], "subKey")

}

type projectMap struct {
	vMap    map[string][]string
	rwMutex sync.RWMutex
}

func (v *projectMap) PushMainMap(key string, value []string) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()
	v.vMap[key] = value

}

func (v *projectMap) GetMainMap(key string) ([]string, bool) {
	v.rwMutex.RLock()
	defer v.rwMutex.RUnlock()
	value, ok := v.vMap[key]

	return value, ok
}

func (v *projectMap) SetNXAndGetMainMap(key string, value []string) ([]string, bool) {
	v.rwMutex.Lock()
	defer v.rwMutex.Unlock()
	var ok = false
	if value, ok = v.vMap[key]; !ok {
		v.vMap[key] = value
	}

	return value, ok
}

func (apiHandler *APIHandler) handleGetImageRepositoryProjectList(request *restful.Request, response *restful.Response) {
	logName := "handleGetImageRepositoryProjectList"

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := parseNamespacePathParameter(request)
	result, err := imagerepository.GetImageRepositoryList(devopsClient, namespace, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	//from here begin append transtion

	log.Printf("%s result is %#v", logName, result)

	//vMap := make(map[string]map[string]string)

	vMap := VMap{vMap: make(map[string]map[string]string), rwMutex: sync.RWMutex{}}

	projectMap := projectMap{vMap: make(map[string][]string), rwMutex: sync.RWMutex{}}

	//concurrent

	if result == nil || result.Items == nil {
		log.Printf("%s result or result.Items is nil", logName)
		return
	}

	log.Printf("%s result.Items len is %#v", logName, len(result.Items))

	bindingList, err := imageregistrybinding.GetImageRegistryBindingList(devopsClient, namespace, dataSelect)
	if err != nil {
		return
	}
	wg := sync.WaitGroup{}
	wg.Add(len(bindingList.Items))

	for _, repo := range result.Items {

		vMap.PushSubMap(repo.Spec.ImageRegistry.Name, strings.Split(repo.Spec.Image, "/")[0], strings.Split(repo.Spec.Image, "/")[0])

	}

	log.Printf("%s init vMap is %#v", logName, vMap)

	for _, binding := range bindingList.Items {

		log.Printf("%s in loop with binding is %#v", logName, binding)

		//create a goroutine for registry,one registry only create goroutine once

		go func(id string, binding imageregistrybinding.ImageRegistryBinding) {
			defer wg.Done()

			logName := logName + "-goroutine-" + id

			log.Printf("%s in loop with binding is %#v", logName, binding)

			//concurrent problems
			if _, ok := vMap.SetNXAndGetMainMap(binding.Spec.ImageRegistry.Name, make(map[string]string)); !ok {

				log.Printf("%s in loop with getregistry is not exist", logName)
			}

			log.Printf("%s in loop with vmap1 is %#v", logName, vMap)

			projectListFromBinding := binding.Spec.RepoInfo.Repositories
			log.Printf("%s in goroutine projectListFromBinding is %#v", logName, projectListFromBinding)

			if projectListFromBinding == nil {
				return
			}
			if len(projectListFromBinding) == 1 && projectListFromBinding[0] == "/" {

				//is from cache?
				if projectListFromMap, ok := projectMap.GetMainMap(binding.Spec.ImageRegistry.Name); !ok {
					projectListFromBinding = make([]string, 0)
					projectDataListInLoop, err := imageregistry.GetProjectList(devopsClient, binding.Spec.ImageRegistry.Name, binding.Spec.Secret.Name, binding.Spec.Secret.Namespace)
					log.Printf("%s in goroutine projectDataListInLoop is %#v", logName, projectDataListInLoop)
					if err != nil {
						return
					}
					for _, p := range projectDataListInLoop.Items {
						projectListFromBinding = append(projectListFromBinding, p.ObjectMeta.Name)
					}
					projectMap.PushMainMap(binding.Spec.ImageRegistry.Name, projectListFromBinding)
				} else {
					projectListFromBinding = projectListFromMap
				}

			}

			registry, err := imageregistry.GetImageRegistry(devopsClient, binding.Spec.ImageRegistry.Name)
			log.Printf("%s in goroutine registry is %#v", logName, registry)
			if err != nil {
				return
			}

			//when vMap is completed,use registry`s project reduce vMap
			for _, projectInLoop := range projectListFromBinding {
				projectName := strings.Split(projectInLoop, "/")[0]

				log.Printf("%s in goroutine with vMap is %#v", logName, vMap)

				log.Printf("%s in goroutine with projectname is %#v", logName, projectName)

				//if _, ok := vMap.GetSubMap(binding.Spec.ImageRegistry.Name, projectName); !ok {
				if _, ok := vMap.SetNXAndGetSubMap(binding.Spec.ImageRegistry.Name, projectName, ""); !ok {

					repo := imagerepository.ImageRepository{
						ObjectMeta: api.ObjectMeta{
							Name:              "project-" + projectName,
							Namespace:         binding.ObjectMeta.Namespace,
							CreationTimestamp: binding.ObjectMeta.CreationTimestamp,
							Annotations: map[string]string{
								"imageRegistryEndpoint": strings.Split(registry.Spec.HTTP.Host, "//")[len(strings.Split(registry.Spec.HTTP.Host, "//"))-1],
								"imageRegistryType":     registry.Spec.Type.String(),
								"imageRepositoryLink":   "",
								"secretName":            binding.Spec.Secret.Name,
								"secretNamespace":       binding.Spec.Secret.Namespace,
							},
						},
						Spec: v1alpha1.ImageRepositorySpec{
							Image: projectName,
						}, Status: v1alpha1.ImageRepositoryStatus{
							ServiceStatus: v1alpha1.ServiceStatus{
								Phase:   v1alpha1.ServiceStatusPhase("Ready"),
								Message: "",
							},
							Tags: []v1alpha1.ImageTag{},
						},
					}

					log.Printf("%s in goroutine repo is %#v", logName, repo)

					result.Items = append(result.Items, repo)

					result.ListMeta.TotalItems += 1

					log.Printf("%s in goroutine result.Items is %#v", logName, result.Items)
				}

			}

		}(binding.ObjectMeta.Name, binding)

	}
	wg.Wait()

	log.Printf("%s when end loop result is %#v", logName, result)
	log.Printf("%s when end loop vMap is %#v", logName, vMap)

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRepositoryListInBinding(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	dataSelect := parseDataSelectPathParameter(request)
	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	result, err := imagerepository.GetImageRepositoryListInBinding(devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRegistryBindingSecretList(request *restful.Request, response *restful.Response) {
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
	binding, err := imageregistrybinding.GetImageRegistryBinding(devopsClient, namespace, name)
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
		ListMeta: api.ListMeta{TotalItems: 1},
		Secrets:  secrets,
	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageOriginRepositoryList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := imageregistrybinding.GetImageOriginRepositoryList(devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageOriginRepositoryProjectList(request *restful.Request, response *restful.Response) {
	logName := "handleGetImageOriginRepositoryProjectList"

	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	namespace := request.PathParameter("namespace")
	name := request.PathParameter("name")
	dataSelect := parseDataSelectPathParameter(request)
	result, err := imageregistrybinding.GetImageOriginRepositoryList(devopsClient, namespace, name, dataSelect)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	//start with project no repository

	binding, err := imageregistrybinding.GetImageRegistryBinding(devopsClient, namespace, name)
	log.Printf("%s binding is %#v", logName, binding)
	if err != nil {
		return
	}

	if v, err := imageregistry.GetImageRegistry(devopsClient, binding.Spec.ImageRegistry.Name); err != nil {
		return
	} else if v.Spec.Type == "Harbor" {

		projectList, err := imageregistry.GetProjectList(devopsClient, binding.Spec.ImageRegistry.Name, binding.Spec.Secret.Name, binding.Spec.Secret.Namespace)
		log.Printf("%s projectList is %#v", logName, projectList)
		if err != nil {
			log.Printf("%s projectList error %#v", logName, err)
			return
		}

		vmap := make(map[string]string)

		for _, repo := range result.Items {
			vmap[strings.Split(repo, "/")[0]] = ""
		}

		for _, project := range projectList.Items {
			if _, ok := vmap[project.ObjectMeta.Name]; !ok {
				result.Items = append(result.Items, project.ObjectMeta.Name)
			}
		}

		log.Printf("%s result.Items is %#v", logName, result.Items)

		log.Printf("%s result is %#v", logName, result)

	}

	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRepositoryTagList(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	result, err := imagerepository.GetImageTagList(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) handleGetImageRepositoryDetail(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	result, err := imagerepository.GetImageRepository(devopsClient, namespace, name)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) HandleScanImage(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	tag := request.QueryParameter("tag")

	result, err := imagerepository.ScanImage(devopsClient, namespace, name, tag)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(result.StatusCode, result)
}

func (apiHandler *APIHandler) HandleGetVulnerability(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	tag := request.QueryParameter("tag")

	result, err := imagerepository.GetVulnerability(devopsClient, namespace, name, tag)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}

func (apiHandler *APIHandler) HandleGetImageTags(request *restful.Request, response *restful.Response) {
	devopsClient, err := apiHandler.cManager.DevOpsClient(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	name := request.PathParameter("name")
	namespace := request.PathParameter("namespace")
	sortBy := request.QueryParameter("sortBy")
	sortMode := request.QueryParameter("sortMode")

	result, err := imagerepository.GetImageTags(devopsClient, namespace, name, sortBy, sortMode)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, result)
}
