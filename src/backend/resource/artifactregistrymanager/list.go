package artifactregistrymanager

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"log"
)

type ArtifactRegistryManagerList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	Items []ArtifactRegistryManager `json:"artifactregistrymanagers"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type ArtifactRegistryManager struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ArtifactRegistryManagerSpec `json:"spec"`
	Status v1alpha1.ServiceStatus               `json:"status"`
}

func GetArtifactRegistryManagerList(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*ArtifactRegistryManagerList, error) {
	log.Println("Getting list of artifactregistrymanager list")

	armList, err := client.DevopsV1alpha1().ArtifactRegistryManagers().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing artifactregistrymanager", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(armList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(armArray []v1alpha1.ArtifactRegistryManager, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ArtifactRegistryManagerList {
	armList := &ArtifactRegistryManagerList{
		Items:    make([]ArtifactRegistryManager, 0),
		ListMeta: api.ListMeta{TotalItems: len(armArray)},
	}

	armCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(armArray), dsQuery)
	armArray = fromCells(armCells)
	armList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	armList.Errors = nonCriticalErrors

	for _, arm := range armArray {
		armList.Items = append(armList.Items, toDetailsInList(arm))
	}

	return armList
}

func toDetailsInList(arm v1alpha1.ArtifactRegistryManager) ArtifactRegistryManager {
	crs := ArtifactRegistryManager{
		ObjectMeta: api.NewObjectMeta(arm.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindArtifactRegistryManager),
		Spec:       arm.Spec,
		Status:     arm.Status,
	}
	if crs.ObjectMeta.Annotations == nil {
		crs.ObjectMeta.Annotations = make(map[string]string, 0)
	}

	return crs
}
