package pipelineconfig

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"

	"strconv"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/pipeline"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
	"k8s.io/client-go/kubernetes"
)

type PipelineConfigDetail struct {
	// same as PipelineConfig
	PipelineConfig

	MulitiBranchPipelines map[string][]pipeline.Pipeline `json:"mulitiBranchPipelines"`
	// but add the last execution details
	// TODO
}

type PipelineConfigTrigger struct {
	Name      string                             `json:"name"`
	Namespace string                             `json:"namespace"`
	Branch    string                             `json:"branch"`
	Commit    string                             `json:"commit"`
	Params    []devopsv1alpha1.PipelineParameter `json:"params"`
}

type PipelineTriggerResponse struct {
	*devopsv1alpha1.Pipeline
}

// GetPipelineConfigDetail get pipeline config details
func GetPipelineConfigDetail(client devopsclient.Interface, k8sclient kubernetes.Interface, namespace string,
	name string) (*PipelineConfigDetail, error) {
	log.Printf("Getting details of PipelineConfig %s/%s", namespace, name)

	config, err := client.DevopsV1alpha1().PipelineConfigs(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Printf("Error listing PipelineConfig: namespace %s. err %v", namespace, err)
		return nil, err
	}

	labelSelector := labels.NewSelector()
	req, _ := labels.NewRequirement("pipelineConfig", selection.DoubleEquals, []string{name})
	labelSelector = labelSelector.Add(*req)
	listOptions := metaV1.ListOptions{
		LabelSelector:   labelSelector.String(),
		ResourceVersion: "0",
	}
	log.Println("listOptions: ", listOptions.String())

	pipelines, err := client.DevopsV1alpha1().Pipelines(namespace).List(listOptions)
	if err != nil {
		log.Printf("Error listing Pipeline: namespace %s. err %v", namespace, err)
		return nil, err
	}

	if config.Labels != nil {
		if kind, ok := config.Labels[devopsv1alpha1.LabelPipelineKind]; ok && kind == devopsv1alpha1.LabelPipelineKindMultiBranch {
			pipelineConfig, multiPipelines := toMultiBranchPipelineConfig(*config, pipelines.Items)

			return &PipelineConfigDetail{
				PipelineConfig:        pipelineConfig,
				MulitiBranchPipelines: multiPipelines,
			}, nil
		}
	}

	return &PipelineConfigDetail{
		PipelineConfig: toPipelineConfig(*config, pipelines.Items),
	}, nil
}

func toMultiBranchPipelineConfig(config devopsv1alpha1.PipelineConfig, pipelines []devopsv1alpha1.Pipeline) (
	pipelineConfig PipelineConfig, multiPipelines map[string][]pipeline.Pipeline) {
	pipelineConfig = PipelineConfig{
		ObjectMeta: api.NewObjectMeta(config.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipelineConfig),
		// data here
		Spec:   config.Spec,
		Status: config.Status,
	}

	if config.Annotations == nil {
		return
	}

	annotations := config.Annotations
	allBranches := make([]string, 0)
	allBranches = append(allBranches, collectBranches(common.AnnotationsKeyMultiBranchBranchList, annotations, allBranches)...)
	allBranches = append(allBranches, collectBranches(common.AnnotationsKeyMultiBranchStaleBranchList, annotations, allBranches)...)
	allBranches = append(allBranches, collectBranches(common.AnnotationsKeyMultiBranchPRList, annotations, allBranches)...)
	allBranches = append(allBranches, collectBranches(common.AnnotationsKeyMultiBranchStalePRList, annotations, allBranches)...)

	multiPipelines = make(map[string][]pipeline.Pipeline, 0)
	// init it
	for _, branch := range allBranches {
		multiPipelines[branch] = []pipeline.Pipeline{}
	}

	lastesPipelines := latestMultiBranchPipeline(allBranches, pipelines)
	// convert data struct
	// branch * max, branch and max will not be a big value
	for branch, items := range lastesPipelines {
		for _, item := range items {
			multiPipelines[branch] = append(multiPipelines[branch], pipeline.ToPipeline(item))
		}
	}

	return
}

func collectBranches(annotationKey string, annotations map[string]string, allBranches []string) []string {

	if branch, ok := annotations[annotationKey]; ok {
		var branches []string
		if err := json.Unmarshal([]byte(branch), &branches); err == nil {
			allBranches = append(allBranches, branches...)
		} else {
			log.Printf("ERROR: collect branches error in multi branch pipelineconfig, cannot unmarshall to []string from '%s' ", []byte(branch))
		}
	}

	return allBranches
}

func latestMultiBranchPipeline(branches []string, pipelines []devopsv1alpha1.Pipeline) map[string][]devopsv1alpha1.Pipeline {
	max := 5
	branchesMap := make(map[string]struct{}, len(branches))
	for _, b := range branches {
		branchesMap[b] = struct{}{}
	}

	maxBuildNumPipelines := make(map[string][]devopsv1alpha1.Pipeline) // branch:[]pipeline
	currentMinIndexMap := make(map[string]int)                         // branch: minIndex

	// `Time Complexity`: len(pipelines) * max (Most Bad Case), max will not be a big num
	for _, p := range pipelines {
		annotations := p.ObjectMeta.Annotations
		if annotations == nil {
			continue
		}

		if _, ok := annotations[common.AnnotationsKeyMultiBranchName]; !ok {
			continue
		}

		branch := annotations[common.AnnotationsKeyMultiBranchName]
		_, exists := branchesMap[branch]
		if branch == "" || !exists {
			continue
		}

		currentMinIndex := currentMinIndexMap[branch]

		if _, ok := maxBuildNumPipelines[branch]; !ok {
			maxBuildNumPipelines[branch] = []devopsv1alpha1.Pipeline{}
		}

		if len(maxBuildNumPipelines[branch]) < max {
			// max array is not full
			maxBuildNumPipelines[branch] = append(maxBuildNumPipelines[branch], p)
			currentMinIndex = findMin(maxBuildNumPipelines[branch])
			currentMinIndexMap[branch] = currentMinIndex

		} else {
			// max array is full, we shoul compare it with min value of max array
			minPipeline := maxBuildNumPipelines[branch][currentMinIndex]
			if comparePipeline(p, minPipeline) { //  p > currentMin, we should replace the min element, and find the minIndex again
				maxBuildNumPipelines[branch][currentMinIndex] = p
				currentMinIndex = findMin(maxBuildNumPipelines[branch])
				currentMinIndexMap[branch] = currentMinIndex
			}
		}

	} // after the loop, we will get the latest `max` pipelines of each branch

	// sort the arrar of each branch
	for b, pipes := range maxBuildNumPipelines {
		// the lenght of pipes is not bigger than `max`, so it is not a big spending
		sort.SliceStable(pipes, func(i, j int) bool {
			return comparePipeline(pipes[i], pipes[j])
		})
		maxBuildNumPipelines[b] = pipes
	}

	return maxBuildNumPipelines
}

func findMin(pipelines []devopsv1alpha1.Pipeline) int {
	var min devopsv1alpha1.Pipeline
	var minIndex int
	for index, p := range pipelines {
		if index == 0 {
			min = p
			index = 0
			continue
		}

		if comparePipeline(min, p) { //min > p
			min = p
			minIndex = index
		}
	}
	return minIndex
}

func comparePipeline(left, right devopsv1alpha1.Pipeline) bool {
	// one the pipeline is not sync to  jenkins, so we should compare create timestamp
	if left.Status.Jenkins == nil || right.Status.Jenkins == nil {
		return left.GetObjectMeta().GetCreationTimestamp().After(right.GetObjectMeta().GetCreationTimestamp().Time)
	}

	// we should compare the build num now
	leftBuild := left.Status.Jenkins.Build
	rightBuild := right.Status.Jenkins.Build

	leftBuildNum, errL := strconv.Atoi(leftBuild)
	rightBuildNum, errR := strconv.Atoi(rightBuild)

	if errL != nil || errR != nil {
		return left.GetObjectMeta().GetCreationTimestamp().After(right.GetObjectMeta().GetCreationTimestamp().Time)
	}

	return leftBuildNum > rightBuildNum
}

func pipelinesFilter(branch string, pipelines []devopsv1alpha1.Pipeline, max int) (results []pipeline.Pipeline) {
	count := 0
	targetPipelines := make([]devopsv1alpha1.Pipeline, 0)

	for _, p := range pipelines {
		annotations := p.ObjectMeta.Annotations
		if annotations == nil {
			continue
		}

		if name, ok := annotations[common.AnnotationsKeyMultiBranchName]; !ok || name != branch {
			continue
		}

		targetPipelines = append(targetPipelines, p)
		if count = count + 1; count >= max {
			break
		}
	}

	sort.SliceStable(targetPipelines, func(i, j int) bool {
		return targetPipelines[i].GetObjectMeta().GetCreationTimestamp().After(targetPipelines[j].GetObjectMeta().GetCreationTimestamp().Time)
	})

	results = make([]pipeline.Pipeline, 0)
	for _, p := range targetPipelines {
		results = append(results, pipeline.ToPipeline(p))
	}
	return
}

// UpdatePipelineConfigDetail update pipeline config detail
func UpdatePipelineConfigDetail(client devopsclient.Interface, k8sclient kubernetes.Interface, spec *PipelineConfigDetail) (*PipelineConfigDetail, error) {
	namespace := spec.ObjectMeta.Namespace
	old, err := client.DevopsV1alpha1().PipelineConfigs(namespace).Get(spec.ObjectMeta.Name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	old.Spec = spec.Spec

	old.SetAnnotations(common.MergeAnnotations(old.ObjectMeta.Annotations, spec.ObjectMeta.Annotations))
	old.SetLabels(common.MergeAnnotations(old.ObjectMeta.Labels, spec.ObjectMeta.Labels))

	// set phase as initial
	old.Status.Phase = devopsv1alpha1.PipelineConfigPhaseCreating
	old, err = client.DevopsV1alpha1().PipelineConfigs(namespace).Update(old)
	if err != nil {
		return nil, err
	}
	return spec, nil
}

// DeletePipelineConfig delete pipeline config
func DeletePipelineConfig(client devopsclient.Interface, k8sclient kubernetes.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().PipelineConfigs(namespace).Delete(name, &metaV1.DeleteOptions{})
}

// TriggerPipelineConfig triggers a pipeline
func TriggerPipelineConfig(client devopsclient.Interface, k8sclient kubernetes.Interface, spec *PipelineConfigTrigger) (response *PipelineTriggerResponse, err error) {
	var (
		config *devopsv1alpha1.PipelineConfig
	)
	config, err = client.DevopsV1alpha1().PipelineConfigs(spec.Namespace).Get(spec.Name, api.GetOptionsInCache)
	if err != nil {
		return
	}

	// read only copy to be writable
	config = config.DeepCopy()
	pipe := generatePipelineFromConfig(config)
	if spec.Commit != "" {
		ann := pipe.ObjectMeta.GetAnnotations()
		if ann == nil {
			ann = make(map[string]string)
		}
		ann[common.AnnotationsCommit] = spec.Commit
		pipe.ObjectMeta.SetAnnotations(ann)
	}

	// only exists on mutliBranch case
	branchName := strings.TrimSpace(spec.Branch)
	if config.Labels != nil && config.Labels[devopsv1alpha1.LabelPipelineKind] == devopsv1alpha1.LabelPipelineKindMultiBranch {
		if branchName == "" {
			err = fmt.Errorf("trigger a multiBranch [%s-%s] pipeline needs branch name", spec.Namespace, spec.Name)
			return
		}

		if pipe.Annotations == nil {
			pipe.Annotations = make(map[string]string, 0)
		}

		pipe.Annotations[common.AnnotationsKeyMultiBranchName] = branchName
		var category string

		allBranches := make([]string, 0)
		allBranches = append(allBranches, collectBranches(common.AnnotationsKeyMultiBranchBranchList, config.Annotations, allBranches)...)
		allBranches = append(allBranches, collectBranches(common.AnnotationsKeyMultiBranchStaleBranchList, config.Annotations, allBranches)...)
		for _, branch := range allBranches {
			if branch == branchName {
				category = "branch"
				break
			}
		}

		if category == "" {
			allPRs := make([]string, 0)
			allPRs = append(allPRs, collectBranches(common.AnnotationsKeyMultiBranchPRList, config.Annotations, allPRs)...)
			allPRs = append(allPRs, collectBranches(common.AnnotationsKeyMultiBranchStalePRList, config.Annotations, allPRs)...)
			for _, pr := range allPRs {
				if pr == branchName {
					category = "pr"
					break
				}
			}
		}

		if category == "" {
			err = fmt.Errorf("unknow branch [%s] category for this multi-branch [%s]", branchName, spec.Name)
			return
		}

		pipe.Annotations[common.AnnotationsKeyMultiBranchCategory] = category
	}

	log.Println("Receive params: ", spec.Params)

	pipe.Spec.Parameters = append(pipe.Spec.Parameters, spec.Params...)

	pipe, err = client.DevopsV1alpha1().Pipelines(spec.Namespace).Create(pipe)
	if err != nil {
		return
	}
	response = &PipelineTriggerResponse{
		Pipeline: pipe,
	}
	return
}

func generatePipelineFromConfig(config *devopsv1alpha1.PipelineConfig) (pipe *devopsv1alpha1.Pipeline) {
	pipe = &devopsv1alpha1.Pipeline{
		ObjectMeta: common.CloneMeta(config.ObjectMeta),
		Spec: devopsv1alpha1.PipelineSpec{
			JenkinsBinding: config.Spec.JenkinsBinding,
			PipelineConfig: devopsv1alpha1.LocalObjectReference{
				Name: config.GetName(),
			},
			Cause: devopsv1alpha1.PipelineCause{
				Type:    devopsv1alpha1.PipelineCauseTypeManual,
				Message: "Triggered using Alauda DevOps Console",
			},
			RunPolicy: config.Spec.RunPolicy,
			Triggers:  config.Spec.Triggers,
			Strategy:  config.Spec.Strategy,
			Hooks:     config.Spec.Hooks,
			Source:    config.Spec.Source,
		},
	}
	return
}
