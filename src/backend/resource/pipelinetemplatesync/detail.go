package pipelinetemplatesync

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// GetPipelineTemplateSync get PipelineConfy with the deail
func GetPipelineTemplateSync(client devopsclient.Interface, k8sclient kubernetes.Interface,
	namespace string, name string) (*PipelineTemplateSync, error) {
	pipelineTemplateSync, err := client.DevopsV1alpha1().PipelineTemplateSyncs(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Printf("Error listing PipelineTemplateSyncs: namespace %s, err %v", namespace, err)
		return nil, err
	}

	result := toPipelineTemplateSync(pipelineTemplateSync)
	return &result, nil
}

// UpdatePipelineTemplateSync update PipelineTemplateSync
func UpdatePipelineTemplateSync(client devopsclient.Interface, namespace string, name string, spec *PipelineTemplateSync) (*PipelineTemplateSync, error) {
	if spec == nil {
		return nil, nil
	}

	old, err := client.DevopsV1alpha1().PipelineTemplateSyncs(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	old.Spec = spec.Spec
	old.Status = &devopsv1alpha1.PipelineTemplateSyncStatus{
		Phase:     spec.Status.Phase,
		StartTime: metaV1.Now(),
	}
	_, err = client.DevopsV1alpha1().PipelineTemplateSyncs(namespace).Update(old)
	if err != nil {
		return nil, err
	}

	return spec, nil
}
