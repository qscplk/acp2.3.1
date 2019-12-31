package pipeline

import (
	"k8s.io/apimachinery/pkg/types"
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// RetryRequest request a retry for pipeline
type RetryRequest struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`

	// empty for now
}

type AbortRequest struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`

	// empty for now
}

// GetPipelineDetail get pipeline config details
func GetPipelineDetail(client devopsclient.Interface, k8sclient kubernetes.Interface, namespace string,
	name string) (*Pipeline, error) {
	log.Printf("Getting details of %s pipeline in %s namespace", name, namespace)

	pipe, err := client.DevopsV1alpha1().Pipelines(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	pipeline := &Pipeline{
		ObjectMeta: api.NewObjectMeta(pipe.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipeline),
		Spec:       pipe.Spec,
		Status:     pipe.Status,
	}
	return pipeline, nil
}

// DeletePipeline delete pipeline config
func DeletePipeline(client devopsclient.Interface, k8sclient kubernetes.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().Pipelines(namespace).Delete(name, &metaV1.DeleteOptions{})
}

// RetryPipeline creates a new pipeline using an existing pipeline
func RetryPipeline(client devopsclient.Interface, k8sclient kubernetes.Interface, spec *RetryRequest) (pipe *devopsv1alpha1.Pipeline, err error) {
	var originalPipe *devopsv1alpha1.Pipeline
	originalPipe, err = client.DevopsV1alpha1().Pipelines(spec.Namespace).Get(spec.Name, api.GetOptionsInCache)
	if err != nil {
		return
	}
	pipe = originalPipe.DeepCopy()
	pipe.ObjectMeta = common.CloneMeta(pipe.ObjectMeta)
	if pipe.ObjectMeta.Labels != nil {
		if _, ok := pipe.ObjectMeta.Labels["created_by"]; ok {
			pipe.ObjectMeta.Labels["created_by"] = ""
		}
	}
	pipe.SetAnnotations(cleanupAnnotations(pipe.GetAnnotations()))
	pipe, err = client.DevopsV1alpha1().Pipelines(spec.Namespace).Create(pipe)
	return
}

// AbortPipeline stop pipeline
func AbortPipeline(client devopsclient.Interface, k8sclient kubernetes.Interface, spec *AbortRequest) (pipe *devopsv1alpha1.Pipeline, err error) {
	var pipeline *devopsv1alpha1.Pipeline
	pipeline, err = client.DevopsV1alpha1().Pipelines(spec.Namespace).Get(spec.Name, api.GetOptionsInCache)
	if err != nil {
		return
	}

	patchStr := `[{
		"op": "replace",
		"path": "/status/aborted",
		"value": true
	}]`

	return client.DevopsV1alpha1().Pipelines(spec.Namespace).Patch(pipeline.Name, types.JSONPatchType, []byte(patchStr))
}

var annotationsWhitelist = []string{common.AnnotationsPipelineConfigName,
	common.AnnotationsKeyMultiBranchCategory, common.AnnotationsKeyMultiBranchName}

func cleanupAnnotations(annotations map[string]string) (dest map[string]string) {
	dest = make(map[string]string)
	if len(annotations) == 0 {
		return
	}
	for _, k := range annotationsWhitelist {
		if val, ok := annotations[k]; ok {
			dest[k] = val
		}
	}
	return
}
