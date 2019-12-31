package pipelineconfig

import (
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
)

// ScanMultiBranch scan multi-branch pipeline
func ScanMultiBranch(client devopsclient.Interface, namespace string, name string) (err error) {
	_, err = client.DevopsV1alpha1().PipelineConfigs(namespace).Scan(name, &v1alpha1.PipelineConfigScanOptions{
		Delay: 0,
	})
	return
}
