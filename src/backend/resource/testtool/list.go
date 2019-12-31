package testtool

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// testtoolList contains a list of TestTool in the cluster.
type TestToolList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of TestTool.
	Items []TestTool `json:"testtools"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// TestTool is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type TestTool struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.TestToolSpec  `json:"spec"`
	Status v1alpha1.ServiceStatus `json:"status"`
}

// GetTestToolList returns a list of testtool
func GetTestToolList(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*TestToolList, error) {
	log.Println("Getting list of testtool")

	crsList, err := client.DevopsV1alpha1().TestTools().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing testtool", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(testtools []v1alpha1.TestTool, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *TestToolList {
	crsList := &TestToolList{
		Items:    make([]TestTool, 0),
		ListMeta: api.ListMeta{TotalItems: len(testtools)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(testtools), dsQuery)
	testtools = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, jenk := range testtools {
		crsList.Items = append(crsList.Items, toDetailsInList(jenk))
	}

	return crsList
}

func toDetailsInList(testtool v1alpha1.TestTool) TestTool {
	crs := TestTool{
		ObjectMeta: api.NewObjectMeta(testtool.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(v1alpha1.ResourceKindTestTool),
		Spec:       testtool.Spec,
		Status:     testtool.Status,
	}
	if crs.ObjectMeta.Annotations == nil {
		crs.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainTestToolName
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindTestTool
	return crs
}
