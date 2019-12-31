package imageregistry

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// ImageRegistryList contains a list of ImageRegistry in the cluster.
type ImageRegistryList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ImageRegistry.
	Items []ImageRegistry `json:"imageregistries"`

	// list of non-critical errors, that occurred during resource retrieval
	Errors []error `json:"errors"`
}

// ImageRegistry is a presentation layer view of kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type ImageRegistry struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ImageRegistrySpec `json:"spec"`
	Status v1alpha1.ServiceStatus     `json:"status"`
}

// GetImageRegistryList returns a list of imageregistry
func GetImageRegistryList(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*ImageRegistryList, error) {
	log.Println("Getting list of imageregistry")

	irList, err := client.DevopsV1alpha1().ImageRegistries().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing imageregistry", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(irList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(imageRegistries []v1alpha1.ImageRegistry, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ImageRegistryList {
	irList := &ImageRegistryList{
		Items:    make([]ImageRegistry, 0),
		ListMeta: api.ListMeta{TotalItems: len(imageRegistries)},
	}

	irCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(imageRegistries), dsQuery)
	imageRegistries = fromCells(irCells)
	irList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	irList.Errors = nonCriticalErrors

	for _, irs := range imageRegistries {
		irList.Items = append(irList.Items, toDetailsInList(irs))
	}
	return irList
}

func toDetailsInList(imageRegistry v1alpha1.ImageRegistry) ImageRegistry {
	ir := ImageRegistry{
		ObjectMeta: api.NewObjectMeta(imageRegistry.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindImageRegistry),
		Spec:       imageRegistry.Spec,
		Status:     imageRegistry.Status,
	}
	if ir.ObjectMeta.Annotations == nil {
		ir.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	ir.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainArtifactRepositoryName
	ir.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindImageRegistry
	ir.ObjectMeta.Annotations[common.AnnotationsKeyToolItemType] = imageRegistry.Spec.Type.String()
	return ir
}

func GetProjectList(client devopsclient.Interface, name string, secretName, secretNamespace string) (*v1alpha1.ProjectDataList, error) {
	logName := "GetProjectList"

	result := client.DevopsV1alpha1().RESTClient().Get().
		Name(name).Resource("imageregistries").SubResource("projects").Param("secretname", secretName).Param("namespace", secretNamespace).Do()
	log.Printf("%s result is %#v", logName, result)
	if result.Error() != nil {
		log.Printf("%s result error %#v", logName, result.Error())
		return nil, result.Error()
	}

	obj, err := result.Get()
	log.Println("obj", obj, "err", err)
	if err != nil {
		log.Printf("%s obj error %#v", logName, result.Error())
		return nil, err
	}

	projectList := obj.(*v1alpha1.ProjectDataList)
	log.Printf("%s projectList is %#v", logName, projectList)
	return projectList, nil
}
