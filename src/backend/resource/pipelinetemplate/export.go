package pipelinetemplate

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
)

type ExportShowOptions struct {
	TaskName string `json:"taskName"`
}

// GetClusterPipelineTempalteExports return the exports of clusterpipelinetemplate
func GetPipelineTempalteExports(client devopsclient.Interface, namespace string, name string, taskName string) (*v1alpha1.PipelineExportedVariables, error) {
	opts := &v1alpha1.ExportShowOptions{
		TaskName: taskName,
	}

	log.Printf("get exports for pipelinetemplate %s/%s", name, taskName)

	result, err := client.DevopsV1alpha1().PipelineTemplates(namespace).Exports(name, opts)
	return result, err
}
