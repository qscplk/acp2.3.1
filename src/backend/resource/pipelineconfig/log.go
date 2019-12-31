package pipelineconfig

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
)

// GetLogDetails get scan log from multi-branch pipeline
func GetLogDetails(client devopsclient.Interface, namespace string, name string, start int) (*v1alpha1.PipelineConfigLog, error) {
	return client.DevopsV1alpha1().PipelineConfigs(namespace).GetLogs(name, &v1alpha1.PipelineConfigLogOptions{
		Start: int64(start),
	})
}
