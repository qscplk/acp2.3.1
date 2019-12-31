package pipelinetemplate

import (
	"log"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
)

// PreviewOptions used for render jenkinsfile
type PreviewOptions struct {
	Source *v1alpha1.PipelineSource `json:"source"`
	Values map[string]string        `json:"values"`
}

// RenderJenkinsfile render jenkinsfile
func RenderJenkinsfile(client devopsclient.Interface, namespace string, name string, options *PreviewOptions) (jenkinsfile string, err error) {
	var source *v1alpha1.PipelineSource
	if options != nil && options.Source != nil {
		source = options.Source
	}

	opts := &v1alpha1.JenkinsfilePreviewOptions{
		Source: source,
		Values: options.Values,
	}

	log.Printf("Render jenkinsfile from PipelineTemplate namespace[%s], name[%s]", namespace, name)

	result, err := client.DevopsV1alpha1().PipelineTemplates(namespace).Preview(name, opts)
	return result.Jenkinsfile, err
}

// GetCategories collect all categories from PipelineTemplate and ClusterPipelineTemplate
func GetCategories(client devopsclient.Interface, namespace string) (categories map[string]PipelineTemplateCategory) {
	categories = make(map[string]PipelineTemplateCategory)
	clusterTemplates, err := client.DevopsV1alpha1().ClusterPipelineTemplates().List(api.ListEverything)
	if err != nil {
		return
	}

	for _, template := range clusterTemplates.Items {
		putCategory(template.Labels, categories)
	}

	templates, err := client.DevopsV1alpha1().PipelineTemplates(namespace).List(api.ListEverything)
	if err != nil {
		return
	}

	for _, template := range templates.Items {
		putCategory(template.Labels, categories)
	}

	return
}

func putCategory(labels map[string]string, categories map[string]PipelineTemplateCategory) {
	if category, ok := labels["category"]; ok {
		categories[category] = PipelineTemplateCategory{
			Name: category,
		}
	}
}
