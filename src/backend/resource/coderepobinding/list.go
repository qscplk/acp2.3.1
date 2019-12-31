package coderepobinding

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// CodeRepoBindingList contains a list of CodeRepoBinding in the cluster.
type CodeRepoBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of CodeRepoBinding.
	Items []CodeRepoBinding `json:"coderepobindings"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// CodeRepoBinding is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type CodeRepoBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.CodeRepoBindingSpec `json:"spec"`
	Status v1alpha1.ServiceStatus       `json:"status"`
}

type CodeRepoBindingRepositoriesDetails struct {
	*v1alpha1.CodeRepoBindingRepositories
}

// GetRemoteRepositoryList returns a list of remote coderepository
func GetRemoteRepositoryList(client devopsclient.Interface, namespace, name string, dsQuery *dataselect.DataSelectQuery) (*CodeRepoBindingRepositoriesDetails, error) {
	log.Println("Getting remote coderepository")
	opts := &v1alpha1.CodeRepoBindingRepositoryOptions{}
	result, err := client.DevopsV1alpha1().CodeRepoBindings(namespace).GetRemoteRepositories(name, opts)
	if err != nil {
		return nil, err
	}

	return &CodeRepoBindingRepositoriesDetails{
		result,
	}, nil
}

// GetCodeRepoBindingList returns a list of coderepository
func GetCodeRepoBindingList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*CodeRepoBindingList, error) {
	log.Println("Getting list of coderepository")

	crsList, err := client.DevopsV1alpha1().CodeRepoBindings(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing coderepository", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(codeRepoBindings []v1alpha1.CodeRepoBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *CodeRepoBindingList {
	crsList := &CodeRepoBindingList{
		Items:    make([]CodeRepoBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(codeRepoBindings)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(codeRepoBindings), dsQuery)
	codeRepoBindings = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, jenk := range codeRepoBindings {
		crsList.Items = append(crsList.Items, toDetailsInList(jenk))
	}

	return crsList
}

func toDetailsInList(codeRepoBinding v1alpha1.CodeRepoBinding) CodeRepoBinding {
	crb := CodeRepoBinding{
		ObjectMeta: api.NewObjectMeta(codeRepoBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeRepoBinding),
		Spec:       codeRepoBinding.Spec,
		Status:     codeRepoBinding.Status,
	}

	if crb.ObjectMeta.Annotations == nil {
		crb.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainCodeRepositoryName
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindCodeRepoService
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemType] = getValueFromLabels(codeRepoBinding.GetLabels(), v1alpha1.LabelCodeRepoServiceType)
	crb.ObjectMeta.Annotations[common.AnnotationsKeyToolItemPublic] = getValueFromLabels(codeRepoBinding.GetLabels(), v1alpha1.LabelCodeRepoServicePublic)
	return crb
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
