package artifactregistry

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"log"
)

type ArtifactRegistryList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	Items []ArtifactRegistry `json:"artifactregistries"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type ArtifactRegistry struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ArtifactRegistrySpec `json:"spec"`
	Status v1alpha1.ServiceStatus        `json:"status"`
}

func GetArtifactRegistryList(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*ArtifactRegistryList, error) {
	log.Println("Getting list of artifactregistry list")

	armList, err := client.DevopsV1alpha1().ArtifactRegistries().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing artifactregistry", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(armList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(armArray []v1alpha1.ArtifactRegistry, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ArtifactRegistryList {
	armList := &ArtifactRegistryList{
		Items:    make([]ArtifactRegistry, 0),
		ListMeta: api.ListMeta{TotalItems: len(armArray)},
	}

	armCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(armArray), dsQuery)
	armArray = fromCells(armCells)
	armList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	armList.Errors = nonCriticalErrors

	for _, ar := range armArray {
		armList.Items = append(armList.Items, toDetailsInList(ar))
	}

	return armList
}

func toDetailsInList(arm v1alpha1.ArtifactRegistry) ArtifactRegistry {
	crs := ArtifactRegistry{
		ObjectMeta: api.NewObjectMeta(arm.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindArtifactRegistry),
		Spec:       arm.Spec,
		Status:     arm.Status,
	}
	if crs.ObjectMeta.Annotations == nil {
		crs.ObjectMeta.Annotations = make(map[string]string, 0)
	}

	return crs
}
