package imagerepository

import (
	"alauda.io/diablo/src/backend/resource/common"
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type ResourceItem struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Kind      string `json:"kind"`
}

type ResourceList struct {
	Items []ResourceItem `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval
	Errors []error `json:"errors"`
}

// ImageRepositoryList contains a list of ImageRepository in the cluster.
type ImageRepositoryList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ImageRepository.
	Items []ImageRepository `json:"imagerepositories"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ImageRepository is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type ImageRepository struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ImageRepositorySpec   `json:"spec"`
	Status v1alpha1.ImageRepositoryStatus `json:"status"`
}

// ImageTagList contains a list of ImageTag in the cluster.
type ImageTagList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// ordered list of tags
	Items []v1alpha1.ImageTag `json:"tags"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetImageRepositoryList returns a list of imagerepobinding
func GetImageRepositoryList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*ImageRepositoryList, error) {
	log.Println("Getting list of repository")
	irList, err := client.DevopsV1alpha1().ImageRepositories(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("Error while listing repositories", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != err {
		return nil, criticalError
	}
	return toList(irList.Items, nonCriticalErrors, dsQuery), nil
}

// GetImageRepositoryList returns a list of coderepobinding
func GetImageRepositoryListInBinding(client devopsclient.Interface, namespace, name string, dsQuery *dataselect.DataSelectQuery) (*ImageRepositoryList, error) {
	log.Println("Getting list of repository from binding ", name)

	binding, err := client.DevopsV1alpha1().ImageRegistryBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	irList, err := client.DevopsV1alpha1().ImageRepositories(namespace).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing repositories", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	var repos []v1alpha1.ImageRepository
	for _, item := range irList.Items {
		for _, condition := range binding.Status.Conditions {
			if item.GetName() == condition.Name {
				repos = append(repos, item)
			}
		}
	}

	return toList(repos, nonCriticalErrors, dsQuery), nil
}

// GetImageTagList returns a list of tags
func GetImageTagList(client devopsclient.Interface, namespace, name string) (*ImageTagList, error) {
	log.Println("Getting tag list of repository ", name)
	its := &ImageTagList{}
	result, err := GetImageRepository(client, namespace, name)
	if err != nil {
		return nil, err
	}
	tags := result.Status.Tags
	for _, tag := range tags {
		its.Items = append(its.Items, tag)
	}
	return its, nil
}

func toList(imageRepositories []v1alpha1.ImageRepository, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ImageRepositoryList {
	irList := &ImageRepositoryList{
		Items:    make([]ImageRepository, 0),
		ListMeta: api.ListMeta{TotalItems: len(imageRepositories)},
	}

	irCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(imageRepositories), dsQuery)
	imageRepositories = fromCells(irCells)
	irList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	irList.Errors = nonCriticalErrors

	for _, repo := range imageRepositories {
		irList.Items = append(irList.Items, toDetailsInList(repo))
	}

	return irList
}

func toDetailsInList(imageRepository v1alpha1.ImageRepository) ImageRepository {
	crs := ImageRepository{
		ObjectMeta: api.NewObjectMeta(imageRepository.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindImageRepository),
		Spec:       imageRepository.Spec,
		Status:     imageRepository.Status,
	}
	return crs
}
