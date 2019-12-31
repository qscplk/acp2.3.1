package imageregistrybinding

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// ImageRegistryBindingList contains a list of ImageRegistryBinding in the cluster.
type ImageRegistryBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ImageRegistryBinding.
	Items []ImageRegistryBinding `json:"imageregistrybindings"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ImageRegistryBinding is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type ImageRegistryBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ImageRegistryBindingSpec `json:"spec"`
	Status v1alpha1.ServiceStatus            `json:"status"`
}

type ImageRegistryBindingRepositoriesDetails struct {
	*v1alpha1.ImageRegistryBindingRepositories
}

// GetImageOriginRepositoryList returns a list of remote imageRepository
func GetImageOriginRepositoryList(client devopsclient.Interface, namespace, name string, dsQuery *dataselect.DataSelectQuery) (*ImageRegistryBindingRepositoriesDetails, error) {
	log.Println("Getting remote imageRepository")

	result := client.DevopsV1alpha1().RESTClient().Get().Namespace(namespace).
		Name(name).Resource("imageregistrybindings").SubResource("repositories").Do()
	if result.Error() != nil {
		return nil, result.Error()
	}

	obj, err := result.Get()
	log.Println("obj", obj, "err", err)
	if err != nil {
		return nil, err
	}

	bindingRepositories := obj.(*v1alpha1.ImageRegistryBindingRepositories)
	return &ImageRegistryBindingRepositoriesDetails{
		bindingRepositories,
	}, nil
}

func GetImageRegistryBindingList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*ImageRegistryBindingList, error) {
	log.Println("Getting list of imagerepository")

	irbList, err := client.DevopsV1alpha1().ImageRegistryBindings(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing imageRepository", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}
	return toList(irbList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(imageRegistryBindings []v1alpha1.ImageRegistryBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ImageRegistryBindingList {
	irbList := &ImageRegistryBindingList{
		Items:    make([]ImageRegistryBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(imageRegistryBindings)},
	}

	irbCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(imageRegistryBindings), dsQuery)
	imageRegistryBindings = fromCells(irbCells)
	irbList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	irbList.Errors = nonCriticalErrors

	for _, irb := range imageRegistryBindings {
		irbList.Items = append(irbList.Items, toDetailsInList(irb))
	}
	return irbList
}

func toDetailsInList(imageRegistryBinding v1alpha1.ImageRegistryBinding) ImageRegistryBinding {
	irb := ImageRegistryBinding{
		ObjectMeta: api.NewObjectMeta(imageRegistryBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindImageRegistryBinding),
		Spec:       imageRegistryBinding.Spec,
		Status:     imageRegistryBinding.Status,
	}
	if irb.ObjectMeta.Annotations == nil {
		irb.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	irb.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainArtifactRepositoryName
	irb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindImageRegistry
	irb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemType] = getValueFromLabels(imageRegistryBinding.GetLabels(), v1alpha1.LabelImageRegistryType)
	return irb
}

func getValueFromLabels(labels map[string]string, key string) string {
	if labels == nil {
		return ""
	}

	if value, ok := labels[key]; ok {
		return value
	}
	return ""
}
