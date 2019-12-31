package pipelineconfig

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
)

// RenderJenkinsfile render jenkinsfile
func RenderJenkinsfile(client devopsclient.Interface, namespace string, spec *PipelineConfigDetail) (jenkinsfile string, err error) {
	opts := &v1alpha1.JenkinsfilePreviewOptions{
		PipelineConfigSpec: &spec.Spec,
	}

	name := spec.PipelineConfig.ObjectMeta.Name
	result, err := client.DevopsV1alpha1().PipelineConfigs(namespace).Preview(name, opts)
	if err != nil {
		log.Printf("jenkinsfile preview error: %v", err)
		return "", err
	}

	return result.Jenkinsfile, nil
}
