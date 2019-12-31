package pipelinetasktemplate

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
)

// PipelineTaskTemplateLists contains a list of PipelineTaskTemplate
type PipelineTaskTemplateList struct {
	ListMeta api.ListMeta           `json:"listMeta"`
	Items    []PipelineTaskTemplate `json:"pipelinetasktemplates"`
	Errors   []error                `json:"errors"`
}

// PipelineTaskTemplate ia presentaion layer view of Kubernetes resources
type PipelineTaskTemplate struct {
	ObjectMeta api.ObjectMeta `json:"metadata"`
	TypeMeta   api.TypeMeta   `json:",inline"`

	Spec devopsv1alpha1.PipelineTaskTemplateSpec `json:"spec"`
}

// GetPipelineTaskTemplateList get list of PipelineTaskTemplate
func GetPipelineTaskTemplateList(client devopsclient.Interface, namespace string) (*PipelineTaskTemplateList, error) {
	list, err := client.DevopsV1alpha1().PipelineTaskTemplates(namespace).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing pipelineTaskTemplates", err)
	}
	_, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(list.Items), nil
}

func toList(list []devopsv1alpha1.PipelineTaskTemplate) *PipelineTaskTemplateList {
	pipelineTaskTemplateList := &PipelineTaskTemplateList{
		Items:    make([]PipelineTaskTemplate, 0),
		ListMeta: api.ListMeta{TotalItems: len(list)},
	}

	for _, task := range list {
		pipelineTaskTemplateList.Items = append(pipelineTaskTemplateList.Items, toPipelineTaskTemplate(&task))
	}
	return pipelineTaskTemplateList
}

func toPipelineTaskTemplate(origin *devopsv1alpha1.PipelineTaskTemplate) PipelineTaskTemplate {
	return PipelineTaskTemplate{
		ObjectMeta: api.NewObjectMeta(origin.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipelineTaskTemplate),
		Spec:       origin.Spec,
	}
}

// GetPipelineTaskTemplate get specific PipelineTaskTemplate by condition
func GetPipelineTaskTemplate(client devopsclient.Interface, namespace string, name string) (*PipelineTaskTemplate, error) {
	origin, err := client.DevopsV1alpha1().PipelineTaskTemplates(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Printf("error get pipelineTaskTemplate, namespace: %s, name %s, error %v", namespace, name, err)
		return nil, err
	}

	result := toPipelineTaskTemplate(origin)
	return &result, nil
}
