package clusterpipelinetemplate

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
)

// PreviewOptions used for render jenkinsfile
type PreviewOptions struct {
	Source *v1alpha1.PipelineSource `json:"source"`
	Values map[string]string        `json:"values"`
}

// RenderJenkinsfile render jenkinsfile
func RenderJenkinsfile(client devopsclient.Interface, name string, options *PreviewOptions) (jenkinsfile string, err error) {
	var source *v1alpha1.PipelineSource
	if options != nil && options.Source != nil {
		source = options.Source
	}

	opts := &v1alpha1.JenkinsfilePreviewOptions{
		Source: source,
		Values: options.Values,
	}

	log.Printf("Render jenkinsfile from PipelineTemplate name[%s]", name)

	result, err := client.DevopsV1alpha1().ClusterPipelineTemplates().Preview(name, opts)
	return result.Jenkinsfile, err
}
