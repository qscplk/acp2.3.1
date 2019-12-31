package projectmanagementbinding

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// ProjectManagementBindingList contains a list of ProjectManagementBinding in the cluster.
type ProjectManagementBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of ProjectManagementBinding.
	Items []ProjectManagementBinding `json:"projectmanagebindings"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// ProjectManagementBinding is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type ProjectManagementBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.ProjectManagementBindingSpec `json:"spec"`
	Status v1alpha1.ServiceStatus                `json:"status"`
}

// GetProjectManagementBindingList returns a list of projectmanagesitory
func GetProjectManagementBindingList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*ProjectManagementBindingList, error) {
	crsList, err := client.DevopsV1alpha1().ProjectManagementBindings(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing projectmanagebinding", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(projectmanageBindings []v1alpha1.ProjectManagementBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ProjectManagementBindingList {
	crsList := &ProjectManagementBindingList{
		Items:    make([]ProjectManagementBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(projectmanageBindings)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(projectmanageBindings), dsQuery)
	projectmanageBindings = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, jenk := range projectmanageBindings {
		crsList.Items = append(crsList.Items, toDetailsInList(jenk))
	}

	return crsList
}

func toDetailsInList(projectmanageBinding v1alpha1.ProjectManagementBinding) ProjectManagementBinding {
	crb := ProjectManagementBinding{
		ObjectMeta: api.NewObjectMeta(projectmanageBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(v1alpha1.ResourceKindProjectManagementBinding),
		Spec:       projectmanageBinding.Spec,
		Status:     projectmanageBinding.Status,
	}

	if crb.ObjectMeta.Annotations == nil {
		crb.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainProjectManagementName
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindProjectManagement
	return crb
}
