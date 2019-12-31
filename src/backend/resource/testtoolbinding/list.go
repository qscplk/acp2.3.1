package testtoolbinding

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// TestToolBindingList contains a list of TestToolBinding in the cluster.
type TestToolBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of TestToolBinding.
	Items []TestToolBinding `json:"testtoolbindings"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// TestToolBinding is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type TestToolBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.TestToolBindingSpec `json:"spec"`
	Status v1alpha1.ServiceStatus       `json:"status"`
}

// GetTestToolBindingList returns a list of testtoolsitory
func GetTestToolBindingList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*TestToolBindingList, error) {
	crsList, err := client.DevopsV1alpha1().TestToolBindings(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing testtoolbinding", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(testtoolBindings []v1alpha1.TestToolBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *TestToolBindingList {
	crsList := &TestToolBindingList{
		Items:    make([]TestToolBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(testtoolBindings)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(testtoolBindings), dsQuery)
	testtoolBindings = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, jenk := range testtoolBindings {
		crsList.Items = append(crsList.Items, toDetailsInList(jenk))
	}

	return crsList
}

func toDetailsInList(testtoolBinding v1alpha1.TestToolBinding) TestToolBinding {
	crb := TestToolBinding{
		ObjectMeta: api.NewObjectMeta(testtoolBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(v1alpha1.ResourceKindTestToolBinding),
		Spec:       testtoolBinding.Spec,
		Status:     testtoolBinding.Status,
	}

	if crb.ObjectMeta.Annotations == nil {
		crb.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainProjectManagementName
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindTestTool
	return crb
}
