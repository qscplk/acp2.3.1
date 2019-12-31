package codequalitytool

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"github.com/golang/glog"
)

// CodeQualityToolList contains a list of CodeQualityTool in the cluster
type CodeQualityToolList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of CodeQuality
	Items []CodeQualityTool `json:"codequalitytools"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// CodeQualityTool is a presentation layer view of kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type CodeQualityTool struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.CodeQualityToolSpec `json:"spec"`
	Status v1alpha1.ServiceStatus       `json:"status"`
}

// GetCodeQualityToolList returns a list of CodeQualityTool
func ListCodeQualityTool(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*CodeQualityToolList, error) {
	glog.Infof("List CodeQualityTool")
	crsList, err := client.DevopsV1alpha1().CodeQualityTools().List(api.ListEverything)
	if err != nil {
		glog.Infof("error while listing CodeQualityTool: %v", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(codeQualityTools []v1alpha1.CodeQualityTool, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *CodeQualityToolList {
	crsList := &CodeQualityToolList{
		Items:    make([]CodeQualityTool, 0),
		ListMeta: api.ListMeta{TotalItems: len(codeQualityTools)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(codeQualityTools), dsQuery)
	codeQualityTools = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, cqts := range codeQualityTools {
		crsList.Items = append(crsList.Items, toDetailsList(cqts))
	}
	return crsList
}

func toDetailsList(codeQualityTool v1alpha1.CodeQualityTool) CodeQualityTool {
	crs := CodeQualityTool{
		ObjectMeta: api.NewObjectMeta(codeQualityTool.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(v1alpha1.ResourceKindCodeQualityTool),
		Spec:       codeQualityTool.Spec,
		Status:     codeQualityTool.Status,
	}
	if crs.ObjectMeta.Annotations == nil {
		crs.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainCodeQualityToolName
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindCodeQualityTool
	return crs
}
