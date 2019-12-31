package pipelinetemplatesync

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"k8s.io/client-go/kubernetes"

	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PipelineTemplateSyncList contains the list of PipelineTemplateSync
type PipelineTemplateSyncList struct {
	ListMeta api.ListMeta           `json:"listMeta"`
	Items    []PipelineTemplateSync `json:"pipelinetemplatesyncs"`
	Errors   []error                `json:"errors"`
}

// PipelineTemplateSync is presentation layer view of kubernetes.
type PipelineTemplateSync struct {
	ObjectMeta api.ObjectMeta `json:"metadata"`
	TypeMeta   api.TypeMeta   `json:",inline"`

	Spec   devopsv1alpha1.PipelineTemplateSyncSpec    `json:"spec"`
	Status *devopsv1alpha1.PipelineTemplateSyncStatus `json:"status"`
}

// GetPipelineTemplateSyncList returns a PipelineTemplateSynclist
func GetPipelineTemplateSyncList(client devopsclient.Interface,
	namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*PipelineTemplateSyncList, error) {
	pipelineTemplateSynList, err := client.DevopsV1alpha1().PipelineTemplateSyncs(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing pipelineTemplateSyncs", err)
	}
	_, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(pipelineTemplateSynList.Items, dsQuery), nil
}

func toList(list []devopsv1alpha1.PipelineTemplateSync, dsQuery *dataselect.DataSelectQuery) *PipelineTemplateSyncList {
	pipelineTemplateSyncList := &PipelineTemplateSyncList{
		Items:    make([]PipelineTemplateSync, 0),
		ListMeta: api.ListMeta{TotalItems: len(list)},
	}

	for _, sync := range list {
		pipelineTemplateSyncList.Items = append(pipelineTemplateSyncList.Items, toPipelineTemplateSync(&sync))
	}

	return pipelineTemplateSyncList
}

func toPipelineTemplateSync(sync *devopsv1alpha1.PipelineTemplateSync) PipelineTemplateSync {
	return PipelineTemplateSync{
		ObjectMeta: api.NewObjectMeta(sync.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipelineTemplateSync),
		Spec:       sync.Spec,
		Status:     sync.Status,
	}
}

// CreatePipelineTemplateSync create PipelineTemplateSync
func CreatePipelineTemplateSync(client devopsclient.Interface, namespace string, spec *PipelineTemplateSync) (*devopsv1alpha1.PipelineTemplateSync, error) {
	if spec == nil {
		return nil, nil
	}

	sync := &devopsv1alpha1.PipelineTemplateSync{
		TypeMeta: metaV1.TypeMeta{
			Kind:       "PipelineTemplateSync",
			APIVersion: "devops.alauda.io/v1alph1",
		},
		ObjectMeta: metaV1.ObjectMeta{
			Name:        spec.ObjectMeta.Name,
			Namespace:   namespace,
			Annotations: spec.ObjectMeta.Annotations,
			Labels:      spec.ObjectMeta.Labels,
		},
		Spec: spec.Spec,
		Status: &devopsv1alpha1.PipelineTemplateSyncStatus{
			Phase:     spec.Status.Phase,
			StartTime: metaV1.Now(),
		},
	}
	return client.DevopsV1alpha1().PipelineTemplateSyncs(namespace).Create(sync)
}

// DeletePipelineTemplateSync will delete PipelineTemplateSync by namespace and name
func DeletePipelineTemplateSync(client devopsclient.Interface, k8sClient kubernetes.Interface,
	namespace string, name string) error {
	return client.DevopsV1alpha1().PipelineTemplateSyncs(namespace).Delete(name, &metaV1.DeleteOptions{})
}
