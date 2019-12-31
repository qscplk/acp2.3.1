package api

import (
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// ResourceKindProject kind for project resource
	ResourceKindProject  = "project"
	ResourceKindProjectM = "Project"
	// ResourceKindJenkins kind for jenkins resource
	ResourceKindJenkins = "jenkins"
	// ResourceKindJenkins kind for jenkins resource
	ResourceKindJenkinsBinding = "jenkinsbinding"

	// pipeline
	ResourceKindPipelineConfig          = "pipelineconfig"
	ResourceKindPipeline                = "pipeline"
	ResourceKindPipelineTemplate        = "PipelineTemplate"
	ResourceKindPipelineTaskTemplate    = "PipelineTasktemplate"
	ResourceKindPipelineTemplateSync    = "PipelineTemplateSync"
	ResourceKindClusterPipelineTemplate = "ClusterPipelineTemplate"

	// coderepo
	ResourceKindCodeRepoService = "codereposervice"
	ResourceKindCodeRepoBinding = "coderepobinding"
	ResourceKindCodeRepository  = "coderepository"

	// ASF
	ResourceKindMicroservicesEnvironment        = "microservicesEnvironment"
	ResourceKindMicroservicesComponent          = "microservicesComponent"
	ResourceKindMicroservicesEnvironmentBinding = "microservicesEnvironmentBinding"

	// image repo
	ResourceKindImageRegistry        = "imageregistry"
	ResourceKindImageRegistryBinding = "imageregistrybinding"
	ResourceKindImageRepository      = "imagerepository"
	// catalog controller
	ResourceKindChart = "Chart"

	// code quality
	ResourceKindCodeQualityTool    = "codequalitytool"
	ResourceKindCodeQualityBinding = "codequalitybinding"
	ResourceKindCodeQualityProject = "codequalityproject"

	//artifact registry manager
	ResourceKindArtifactRegistryManager = "artifactregistrymanager"
	ResourceKindArtifactRegistry = "artifactregistry"
	ResourceKindArtifactRegistryBinding = "artifactregistrybinding"
)

// NewObjectMetaSplit because of dependency of different applications
// we need to add a method to use only base types
func NewObjectMetaSplit(name, namespace string, labels, annotations map[string]string, creation time.Time) ObjectMeta {
	return ObjectMeta{
		Name:              name,
		Namespace:         namespace,
		Labels:            labels,
		CreationTimestamp: v1.NewTime(creation),
		Annotations:       annotations,
	}
}
