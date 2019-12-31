package pipeline

import (
	"fmt"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"k8s.io/client-go/kubernetes"
)

// InputHandle handle the input request
func InputHandle(client devopsclient.Interface, k8sclient kubernetes.Interface, opts *InputOptions) (
	resp *InputResponse, err error) {
	resp = &InputResponse{
		Success: false,
	}
	pipelineInputOption := &devopsv1alpha1.PipelineInputOptions{
		Approve: opts.Approve,
		InputID: opts.InputID,
		Stage:   opts.Stage,
		Step:    opts.Step,
	}
	if opts.Parameters != nil {
		params := make([]devopsv1alpha1.PipelineParameter, len(opts.Parameters))
		for i, param := range opts.Parameters {
			params[i] = devopsv1alpha1.PipelineParameter{
				Name:  param.Name,
				Value: param.Value,
			}
		}
		pipelineInputOption.Parameters = params
	}
	var response *devopsv1alpha1.PipelineInputResponse
	if response, err = client.DevopsV1alpha1().Pipelines(opts.Namespace).Input(opts.Name, pipelineInputOption); err != nil {
		resp.Message = fmt.Sprintf("%v", err)
		return
	}

	resp.Message = "success"
	resp.Code = response.StatusCode
	return
}

// InputOptions options for pipeline input request
type InputOptions struct {
	Namespace string
	Name      string
	Stage     int64 `json:"stage"`
	Step      int64 `json:"step"`
	// Approve whether approve this
	Approve bool `json:"approve"`
	// InputID is the id for input dsl step from Jenkinsfile
	InputID string `json:"inputID"`
	// Parameters is the parameters of the pipeline input request
	// +optional
	Parameters []Parameter `json:"parameters"`
}

// InputResponse represents for input action response
type InputResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// Parameter represents for parameters in input requests
type Parameter struct {
	// Name is the name of the parameter.
	// +optional
	Name string `json:"name"`
	// Value is the value of the parameter.
	// +optional
	Value string `json:"value"`
}
