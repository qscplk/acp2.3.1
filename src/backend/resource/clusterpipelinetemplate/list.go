package clusterpipelinetemplate

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// ClusterPipelineTemplateList contains a list of ClusterPipelineTemplate
type ClusterPipelineTemplateList struct {
	ListMeta api.ListMeta              `json:"listMeta"`
	Items    []ClusterPipelineTemplate `json:"clusterpipelinetemplates"`
	Errors   []error                   `json:"errors"`
}

// ClusterPipelineTemplate is persentation layer view of Kubernetes resources
type ClusterPipelineTemplate struct {
	ObjectMeta   api.ObjectMeta `json:"metadata"`
	api.TypeMeta `json:",inline"`

	Spec devopsv1alpha1.PipelineTemplateSpec `json:"spec"`
}

// GetClusterPipelineTemplateList get all ClusterPipelineTemplate in a namespace
func GetClusterPipelineTemplateList(client devopsclient.Interface, namespace string, dsQuery *dataselect.DataSelectQuery) (*ClusterPipelineTemplateList, error) {
	originList, err := client.DevopsV1alpha1().ClusterPipelineTemplates().List(api.ListEverything)
	if err != nil {
		log.Println("error when listing  ClusterPipelineTemplate", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(originList.Items, nonCriticalErrors, dsQuery), nil
}

// GetClusterPipelineTemplate get specific ClusterPipelineTemplaet by condition
func GetClusterPipelineTemplate(client devopsclient.Interface, namespace string, name string) (*ClusterPipelineTemplate, error) {
	origin, err := client.DevopsV1alpha1().ClusterPipelineTemplates().Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Println("error when get clusterpipelinetemplate", err)
	}
	_, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, err
	}

	result := toClusterPipelineTemplate(origin)
	return &result, nil
}

func toList(originList []devopsv1alpha1.ClusterPipelineTemplate, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *ClusterPipelineTemplateList {
	list := ClusterPipelineTemplateList{
		Items:    make([]ClusterPipelineTemplate, 0),
		ListMeta: api.ListMeta{TotalItems: len(originList)},
	}

	filteredCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(originList), dsQuery)
	items := fromCells(filteredCells)
	list.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	list.Errors = nonCriticalErrors
	for _, origin := range items {
		list.Items = append(list.Items, toClusterPipelineTemplate(&origin))
	}

	return &list
}

func toClusterPipelineTemplate(origin *devopsv1alpha1.ClusterPipelineTemplate) ClusterPipelineTemplate {
	return ClusterPipelineTemplate{
		ObjectMeta: api.NewObjectMeta(origin.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindClusterPipelineTemplate),
		Spec:       origin.Spec,
	}
}
