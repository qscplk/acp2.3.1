package toolchain

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/devops-apiserver/pkg/toolchain"
	devopsk8s "alauda.io/devops-apiserver/pkg/util/k8s"
	"alauda.io/diablo/src/backend/resource/codequalitybinding"
	"alauda.io/diablo/src/backend/resource/codequalitytool"
	"alauda.io/diablo/src/backend/resource/coderepobinding"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/jenkinsbinding"
	"alauda.io/diablo/src/backend/resource/projectmanagement"
	"alauda.io/diablo/src/backend/resource/testtool"

	"fmt"
	"reflect"
	"sync"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/codereposervice"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/imageregistry"
	"alauda.io/diablo/src/backend/resource/jenkins"

	"log"

	"alauda.io/diablo/src/backend/resource/imageregistrybinding"
	"k8s.io/client-go/kubernetes"
)

// ToolChainList contains a list of tool.
type ToolChainList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ToolChain.
	Items []interface{} `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ToolChainBindingList contains a list of binding in toolchain.
type ToolChainBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ToolChain.
	Items []interface{} `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetToolChainBindingList get binding list in toolchain
func GetToolChainBindingList(
	client devopsclient.Interface, k8sclient kubernetes.Interface, dsQuery *dataselect.DataSelectQuery,
	namespaces *common.NamespaceQuery, toolType string,
) (toolChainBindingList *ToolChainBindingList, err error) {
	log.Println("Getting list of binding")
	toolChainBindingList = &ToolChainBindingList{}

	toolChainList, err := GetToolChainList(client, k8sclient, dsQuery, toolType)
	if err != nil || toolChainList == nil || len(toolChainList.Items) == 0 {
		return
	}

	var (
		jenkinsBindingList       *jenkinsbinding.JenkinsBindingList
		codeRepoBindingList      *coderepobinding.CodeRepoBindingList
		imageRegistryBindingList *imageregistrybinding.ImageRegistryBindingList
		codeQualityBindingList   *codequalitybinding.CodeQualityBindingList
		jenkinsBindingCritical, codeRepoBindingCritical, codeQualityBindingCritical,
		imageRegistryBindingCritical error
		nonCriticals, jenkinsBindingNonCritical, codeRepoBindingNonCritical, codeQualityBindingNonCritical,
		imageRegistryBindingNonCritical []error
		wg sync.WaitGroup
	)
	wg.Add(4)

	go func() {
		jenkinsBindingList, jenkinsBindingCritical = jenkinsbinding.GetJenkinsBindingList(client, k8sclient, namespaces, dsQuery)
		jenkinsBindingNonCritical, jenkinsBindingCritical = errors.HandleError(jenkinsBindingCritical)
		if jenkinsBindingCritical != nil {
			log.Println("error while listing jenkinsbindings", jenkinsBindingCritical)
		}
		wg.Done()
	}()

	go func() {
		codeRepoBindingList, codeRepoBindingCritical = coderepobinding.GetCodeRepoBindingList(client, namespaces, dsQuery)
		codeRepoBindingNonCritical, codeRepoBindingCritical = errors.HandleError(codeRepoBindingCritical)
		if codeRepoBindingCritical != nil {
			log.Println("error while listing coderepobindings", codeRepoBindingCritical)
		}
		wg.Done()
	}()

	go func() {
		imageRegistryBindingList, imageRegistryBindingCritical = imageregistrybinding.GetImageRegistryBindingList(client, namespaces, dsQuery)
		imageRegistryBindingNonCritical, imageRegistryBindingCritical = errors.HandleError(imageRegistryBindingCritical)
		if imageRegistryBindingCritical != nil {
			log.Println("error while listing imageregistrybindings", imageRegistryBindingCritical)
		}
		wg.Done()
	}()

	go func() {
		codeQualityBindingList, codeQualityBindingCritical = codequalitybinding.GetCodeQualityBindingList(client, namespaces, dsQuery)
		codeQualityBindingNonCritical, codeQualityBindingCritical = errors.HandleError(codeQualityBindingCritical)
		if codeQualityBindingCritical != nil {
			log.Println("error while listing codequalitybindings", codeQualityBindingCritical)

		}
		wg.Done()
	}()
	wg.Wait()

	if jenkinsBindingCritical != nil {
		return nil, jenkinsBindingCritical
	}
	if codeRepoBindingCritical != nil {
		return nil, codeRepoBindingCritical
	}
	if imageRegistryBindingCritical != nil {
		return nil, imageRegistryBindingCritical
	}
	if codeQualityBindingCritical != nil {
		return nil, codeRepoBindingCritical
	}

	if jenkinsBindingNonCritical != nil {
		nonCriticals = append(nonCriticals, jenkinsBindingNonCritical...)
	}
	if codeRepoBindingNonCritical != nil {
		nonCriticals = append(nonCriticals, codeRepoBindingNonCritical...)
	}
	if imageRegistryBindingNonCritical != nil {
		nonCriticals = append(nonCriticals, imageRegistryBindingNonCritical...)
	}
	if codeQualityBindingNonCritical != nil {
		nonCriticals = append(nonCriticals, codeQualityBindingNonCritical...)
	}

	for _, toolChain := range toolChainList.Items {
		if toolChain == nil {
			continue
		}

		switch value := toolChain.(type) {
		case jenkins.Jenkins:
			if jenkinsBindingList == nil || jenkinsBindingList.Items == nil {
				continue
			}
			for _, item := range jenkinsBindingList.Items {
				if item.Spec.Jenkins.Name == value.ObjectMeta.Name {
					toolChainBindingList.Items = append(toolChainBindingList.Items, item)
				}
			}

		case codereposervice.CodeRepoService:
			if codeRepoBindingList == nil || codeRepoBindingList.Items == nil {
				continue
			}
			for _, item := range codeRepoBindingList.Items {
				if item.Spec.CodeRepoService.Name == value.ObjectMeta.Name {
					toolChainBindingList.Items = append(toolChainBindingList.Items, item)
				}
			}

		case imageregistry.ImageRegistry:
			if imageRegistryBindingList == nil || imageRegistryBindingList.Items == nil {
				continue
			}
			for _, item := range imageRegistryBindingList.Items {
				if item.Spec.ImageRegistry.Name == value.ObjectMeta.Name {
					toolChainBindingList.Items = append(toolChainBindingList.Items, item)
				}
			}
		case codequalitytool.CodeQualityTool:
			if codeQualityBindingList == nil || codeQualityBindingList.Items == nil {
				continue
			}
			for _, item := range codeQualityBindingList.Items {
				if item.Spec.CodeQualityTool.Name == value.ObjectMeta.Name {
					toolChainBindingList.Items = append(toolChainBindingList.Items, item)
				}
			}

		default:
			log.Println(fmt.Sprintf("value %v, type %s is not defined in this method.", value, reflect.TypeOf(value)))
		}
	}

	return toChainBindingList(toolChainBindingList.Items, nonCriticals), nil
}

func toChainBindingList(items []interface{}, nonCriticalErrors []error) *ToolChainBindingList {
	bindingList := &ToolChainBindingList{
		Items:    items,
		ListMeta: api.ListMeta{TotalItems: len(items)},
	}
	bindingList.Errors = nonCriticalErrors
	return bindingList
}

// GetToolChainList returns a list of toolchain
func GetToolChainList(
	client devopsclient.Interface, k8sclient kubernetes.Interface, dsQuery *dataselect.DataSelectQuery,
	toolType string,
) (toolChainList *ToolChainList, err error) {

	toolChainList = &ToolChainList{}
	elements, err1 := devopsk8s.GetToolChains(k8sclient)
	if err1 != nil {
		err = err1
		return
	}

	if len(elements) == 0 {
		log.Println("No element defined in configmap")
		return
	}

	var toolTypes []string
	if toolType != "" {
		toolTypes = append(toolTypes, toolType)
	} else {
		for _, element := range elements {
			toolTypes = append(toolTypes, element.Name)
		}
	}

	items, err := getToolItemsByToolTypes(client, k8sclient, dsQuery, elements, toolTypes)
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toChainList(items, nonCriticalErrors), nil
}

func getToolItemsByToolTypes(
	client devopsclient.Interface, k8sclient kubernetes.Interface, dsQuery *dataselect.DataSelectQuery,
	elements []*toolchain.Category, toolTypes []string,
) (items []interface{}, err error) {
	log.Println("Get tool items from ", toolTypes)

	var (
		codeRepoServiceList   *codereposervice.CodeRepoServiceList
		jenkinsList           *jenkins.JenkinsList
		imageRegistryList     *imageregistry.ImageRegistryList
		projectManagementList *projectmanagement.ProjectManagementList
		testToolList          *testtool.TestToolList
		codeQualityToolList   *codequalitytool.CodeQualityToolList
		err1                  error
	)

	items = []interface{}{}
	for i, toolType := range toolTypes {
		log.Println(fmt.Sprintf("%d. Get tool items from %s", i, toolType))

		switch toolType {
		case devopsv1alpha1.ToolChainCodeRepositoryName:
			codeRepoServiceList, err1 = codereposervice.GetCodeRepoServiceList(client, dsQuery)
			if err1 != nil {
				err = err1
				return
			}
		case devopsv1alpha1.ToolChainContinuousIntegrationName:
			jenkinsList, err1 = jenkins.GetJenkinsList(client, k8sclient, dsQuery)
			if err1 != nil {
				err = err1
				return
			}
		case devopsv1alpha1.ToolChainArtifactRepositoryName:
			imageRegistryList, err1 = imageregistry.GetImageRegistryList(client, dsQuery)
			if err1 != nil {
				err = err1
				return
			}
		case devopsv1alpha1.ToolChainProjectManagementName:
			projectManagementList, err1 = projectmanagement.GetProjectManagementList(client, dsQuery)
			if err1 != nil {
				err = err1
				return
			}
		case devopsv1alpha1.ToolChainTestToolName:
			testToolList, err1 = testtool.GetTestToolList(client, dsQuery)
			if err1 != nil {
				err = err1
				return
			}
		case devopsv1alpha1.ToolChainCodeQualityToolName:
			codeQualityToolList, err1 = codequalitytool.ListCodeQualityTool(client, dsQuery)
			if err1 != nil {
				err = err1
				return
			}
		}

		toolItems, err1 := getToolItemsByToolType(elements, toolType, codeRepoServiceList, jenkinsList, imageRegistryList,
			projectManagementList, testToolList, codeQualityToolList)
		if err1 != nil {
			err = err1
			return
		}

		if len(toolItems) > 0 {
			items = append(items, toolItems...)
		}
	}

	return
}

func getToolItemsByToolType(
	elements []*toolchain.Category, toolType string,
	codeRepoServiceList *codereposervice.CodeRepoServiceList, jenkinsList *jenkins.JenkinsList,
	imageRegistryList *imageregistry.ImageRegistryList,
	projectManagementList *projectmanagement.ProjectManagementList,
	testToolList *testtool.TestToolList,
	codeQualityToolList *codequalitytool.CodeQualityToolList,
) (items []interface{}, err error) {

	var (
		toolElement *toolchain.Category
	)

	for _, element := range elements {
		if element.Name == toolType {
			toolElement = element
		}
	}

	if toolElement == nil {
		return
	}

	if len(toolElement.Items) == 0 {
		return
	}

	for _, item := range toolElement.Items {
		if item == nil || !item.Enabled {
			continue
		}

		// todo refactor here later
		// fetch items by kind/type/public
		switch item.Kind {
		case devopsv1alpha1.ResourceKindProjectManagement:
			if projectManagementList == nil || len(projectManagementList.Items) == 0 {
				return
			}

			for _, value := range projectManagementList.Items {
				if value.Spec.Type.String() == item.Type {
					if value.ObjectMeta.Annotations == nil {
						value.ObjectMeta.Annotations = make(map[string]string, 1)
					}
					value.ObjectMeta.Annotations[annotationKeyShallow] = devopsv1alpha1.TrueString
					items = append(items, value)
				}
			}
		case devopsv1alpha1.ResourceKindTestTool:
			if testToolList == nil || len(testToolList.Items) == 0 {
				return
			}

			for _, value := range testToolList.Items {
				if value.Spec.Type.String() == item.Type && value.Spec.Public == item.Public {
					if value.ObjectMeta.Annotations == nil {
						value.ObjectMeta.Annotations = make(map[string]string, 1)
					}
					value.ObjectMeta.Annotations[annotationKeyShallow] = devopsv1alpha1.TrueString
					items = append(items, value)
				}
			}
		case devopsv1alpha1.ResourceKindCodeRepoService:
			if codeRepoServiceList == nil || len(codeRepoServiceList.Items) == 0 {
				return
			}

			for _, value := range codeRepoServiceList.Items {
				if value.Spec.Type.String() == item.Type && value.Spec.Public == item.Public {
					items = append(items, value)
				}
			}
		case devopsv1alpha1.ResourceKindJenkins:
			if jenkinsList == nil || len(jenkinsList.Jenkins) == 0 {
				return
			}

			for _, value := range jenkinsList.Jenkins {
				items = append(items, value)
			}
		case devopsv1alpha1.ResourceKindImageRegistry:
			if imageRegistryList == nil || len(imageRegistryList.Items) == 0 {
				return
			}

			for _, value := range imageRegistryList.Items {
				if string(value.Spec.Type) == item.Type {
					items = append(items, value)
				}
			}
		case devopsv1alpha1.ResourceKindCodeQualityTool:
			if codeQualityToolList == nil || len(codeQualityToolList.Items) == 0 {
				return
			}

			for _, value := range codeQualityToolList.Items {
				if string(value.Spec.Type) == item.Type {
					if value.ObjectMeta.Annotations == nil {
						value.ObjectMeta.Annotations = make(map[string]string, 1)
					}
					items = append(items, value)
				}
			}
		}
	}

	return
}

func toChainList(items []interface{}, nonCriticalErrors []error) *ToolChainList {
	toolChainList := &ToolChainList{
		Items:    items,
		ListMeta: api.ListMeta{TotalItems: len(items)},
	}
	toolChainList.Errors = nonCriticalErrors
	return toolChainList
}

const annotationKeyShallow = "alauda.io/shallow"
