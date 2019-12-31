package projectmanagement

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// ProjectManagementList contains a list of ProjectManagement in the cluster.
type ProjectManagementList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ProjectManagement.
	Items []ProjectManagement `json:"jiras"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ProjectManagement is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type ProjectManagement struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ProjectManagementSpec `json:"spec"`
	Status v1alpha1.ServiceStatus         `json:"status"`
}

// GetProjectManagementList returns a list of jira
func GetProjectManagementList(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*ProjectManagementList, error) {
	log.Println("Getting list of jira")

	crsList, err := client.DevopsV1alpha1().ProjectManagements().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing jira", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(jiras []v1alpha1.ProjectManagement, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ProjectManagementList {
	crsList := &ProjectManagementList{
		Items:    make([]ProjectManagement, 0),
		ListMeta: api.ListMeta{TotalItems: len(jiras)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(jiras), dsQuery)
	jiras = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, jenk := range jiras {
		crsList.Items = append(crsList.Items, toDetailsInList(jenk))
	}

	return crsList
}

func toDetailsInList(jira v1alpha1.ProjectManagement) ProjectManagement {
	crs := ProjectManagement{
		ObjectMeta: api.NewObjectMeta(jira.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(v1alpha1.ResourceKindProjectManagement),
		Spec:       jira.Spec,
		Status:     jira.Status,
	}
	if crs.ObjectMeta.Annotations == nil {
		crs.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainProjectManagementName
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindProjectManagement
	return crs
}
