package codequalitybinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"github.com/golang/glog"
)

// CodeQualityBindingList contains a list of CodeQualityBinding in the cluster
type CodeQualityBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of CodeQualityBinding.
	Items []CodeQualityBinding `json:"codequalitybindings"`

	// List of non-critical errors, that occured during resource retrieval
	Errors []error `json:"errors"`
}

// CodeQualityBinding is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type CodeQualityBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.CodeQualityBindingSpec `json:"spec"`
	Status v1alpha1.ServiceStatus          `json:"status"`
}

func GetCodeQualityBindingList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*CodeQualityBindingList, error) {
	glog.Info("Getting codequalitybinding list")

	crsList, err := client.DevopsV1alpha1().CodeQualityBindings(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		glog.Infof("error while listing codequalitybinding: %v", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(codeQualityBindings []v1alpha1.CodeQualityBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *CodeQualityBindingList {
	crsList := &CodeQualityBindingList{
		Items:    make([]CodeQualityBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(codeQualityBindings)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(codeQualityBindings), dsQuery)
	codeQualityBindings = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, cqb := range codeQualityBindings {
		crsList.Items = append(crsList.Items, toDetailsInList(&cqb))
	}

	return crsList
}

func toDetailsInList(codeQualityBinding *v1alpha1.CodeQualityBinding) CodeQualityBinding {
	cqb := toDetails(codeQualityBinding)

	if cqb.ObjectMeta.Annotations == nil {
		cqb.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	cqb.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainCodeQualityToolName
	cqb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindCodeQualityTool
	cqb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemType] = getValueFromLabels(codeQualityBinding.GetLabels(), v1alpha1.LabelCodeQualityToolType)

	return *cqb
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
