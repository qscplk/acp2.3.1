package pipeline

import (
	"fmt"
	"log"
	"strings"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
)

// PipelineList contains a list of jenkins in the cluster.
type PipelineList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Pipeline.
	Items []Pipeline `json:"pipelines"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *PipelineList) GetItems() (res []common.Resource) {
	// return list.Deployments
	res = make([]common.Resource, len(list.Items))
	for i, d := range list.Items {
		res[i] = d
	}
	return
}

// Pipeline is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type Pipeline struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   devopsv1alpha1.PipelineSpec   `json:"spec"`
	Status devopsv1alpha1.PipelineStatus `json:"status"`
}

// GetObjectMeta object meta
func (p Pipeline) GetObjectMeta() api.ObjectMeta {
	return p.ObjectMeta
}

func getLabelSelectorByDsQuery(dsQuery *dataselect.DataSelectQuery) labels.Selector {
	labelSelector := labels.NewSelector()
	if dsQuery == nil || dsQuery.FilterQuery == nil || len(dsQuery.FilterQuery.FilterByList) == 0 {
		return labelSelector
	}

	for _, filterBy := range dsQuery.FilterQuery.FilterByList {
		if filterBy.Property != dataselect.LabelProperty {
			continue
		}

		filterStrs := strings.Split(fmt.Sprintf("%s", filterBy.Value), ",")
		for _, filterStr := range filterStrs {
			keyAndValue := strings.Split(filterStr, ":")
			if len(keyAndValue) == 2 {
				req, _ := labels.NewRequirement(keyAndValue[0], selection.DoubleEquals, []string{keyAndValue[1]})
				labelSelector = labelSelector.Add(*req)
			}
		}
	}

	return labelSelector
}

func GetPipelineList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*PipelineList, error) {
	log.Println("Getting list of pipelines")

	listOptions := metaV1.ListOptions{
		LabelSelector:   getLabelSelectorByDsQuery(dsQuery).String(),
		ResourceVersion: "0",
	}

	pipelineList, err := client.DevopsV1alpha1().Pipelines(namespace.ToRequestParam()).List(listOptions)
	if err != nil {
		log.Println("error while listing pipelines", err)
	}

	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toPipelineList(pipelineList.Items, nonCriticalErrors, dsQuery), nil
}

func toPipelineList(pipelines []devopsv1alpha1.Pipeline, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *PipelineList {
	pipelineList := &PipelineList{
		Items:    make([]Pipeline, 0),
		ListMeta: api.ListMeta{TotalItems: len(pipelines)},
		Errors:   nonCriticalErrors,
	}

	configCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(pipelines), dsQuery)
	pipelines = fromCells(configCells)
	pipelineList.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for _, pipe := range pipelines {
		pipelineList.Items = append(pipelineList.Items, toPipeline(pipe))
	}

	return pipelineList
}

func ToPipeline(pipe devopsv1alpha1.Pipeline) Pipeline {
	return toPipeline(pipe)
}
func toPipeline(pipe devopsv1alpha1.Pipeline) Pipeline {
	pipeline := Pipeline{
		ObjectMeta: api.NewObjectMeta(pipe.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipeline),
		// data here
		Spec:   pipe.Spec,
		Status: pipe.Status,
	}
	return pipeline
}
