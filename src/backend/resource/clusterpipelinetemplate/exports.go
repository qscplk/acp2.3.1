package clusterpipelinetemplate

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
)

type ExportShowOptions struct {
	TaskName string `json:"taskName"`
}

type PipelineExportedVariables struct {
	api.TypeMeta `json:",inline"`
	Values       []GlobalParameter `json:"values"`
}
type GlobalParameter struct {
	// Name the name of parameter
	Name string `json:"name"`
	// Description description of parameter
	// +optional
	Description *I18nName `json:"description"`
}
type I18nName struct {
	// Zh is the Chinese name
	Zh string `json:"zh-CN"`
	// EN is the English name
	En string `json:"en"`
}

// GetClusterPipelineTempalteExports return the exports of clusterpipelinetemplate
func GetClusterPipelineTempalteExports(client devopsclient.Interface, name string, taskName string) (*v1alpha1.PipelineExportedVariables, error) {
	opts := &v1alpha1.ExportShowOptions{
		TaskName: taskName,
	}

	log.Printf("get exports for clusterpipelinetemplate %s/%s", name, taskName)

	result, err := client.DevopsV1alpha1().ClusterPipelineTemplates().Exports(name, opts)
	return result, err
}
