package pipelinetemplate

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// PipelineTemplateList contains a list of PipelineTemplate
type PipelineTemplateList struct {
	ListMeta api.ListMeta       `json:"listMeta"`
	Items    []PipelineTemplate `json:"pipelinetemplates"`
	Errors   []error            `json:"errors"`
}

// PipelineTemplate is presentaion layer view of Kubernetes resources
type PipelineTemplate struct {
	ObjectMeta   api.ObjectMeta `json:"metadata"`
	api.TypeMeta `json:",inline"`

	Spec devopsv1alpha1.PipelineTemplateSpec `json:"spec"`
}

// PipelineTemplateCategory is category for PipelineTemplate
type PipelineTemplateCategory struct {
	Name string `json:"name"`
}

type PipelineTemplateCategoryList struct {
	Items []PipelineTemplateCategory `json:"items"`
}

// GetPipelineTemplateList get all PipelineTemplate in a namespace
func GetPipelineTemplateList(client devopsclient.Interface, namespace string, dsQuery *dataselect.DataSelectQuery) (*PipelineTemplateList, error) {
	originList, err := client.DevopsV1alpha1().PipelineTemplates(namespace).List(api.ListEverything)
	if err != nil {
		log.Println("error when listing PipelineTemplate", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(originList.Items, nonCriticalErrors, dsQuery), nil
}

// GetPipelineTemplate get specific PipelineTemplate by condition
func GetPipelineTemplate(client devopsclient.Interface, namespace string, name string) (*PipelineTemplate, error) {
	origin, err := client.DevopsV1alpha1().PipelineTemplates(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Println("error when get pipelineTemplate", err)
	}
	_, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, err
	}

	result := toPipelineTemplate(origin)
	return &result, nil
}

func toList(originList []devopsv1alpha1.PipelineTemplate, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *PipelineTemplateList {
	list := PipelineTemplateList{
		Items:    make([]PipelineTemplate, 0),
		ListMeta: api.ListMeta{TotalItems: len(originList)},
	}

	filteredCells, fiteredTotal := dataselect.GenericDataSelectWithFilter(toCells(originList), dsQuery)
	items := fromCells(filteredCells)
	list.ListMeta = api.ListMeta{TotalItems: fiteredTotal}
	list.Errors = nonCriticalErrors
	for _, origin := range items {
		list.Items = append(list.Items, toPipelineTemplate(&origin))
	}

	return &list
}

func toPipelineTemplate(origin *devopsv1alpha1.PipelineTemplate) PipelineTemplate {
	return PipelineTemplate{
		ObjectMeta: api.NewObjectMeta(origin.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipelineTemplate),
		Spec:       origin.Spec,
	}
}
