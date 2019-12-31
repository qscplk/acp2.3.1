package pipelineconfig

import (
	"encoding/json"
	goErrors "errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"

	appCore "alauda.io/app-core/pkg/app"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/pipeline"
	"github.com/golang/glog"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
)

// PipelineConfigList a list of PipelineConfigs
type PipelineConfigList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of PipelineConfig.
	Items []PipelineConfig `json:"pipelineconfigs"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetItems return a slice of common.Resource
func (list *PipelineConfigList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.Items))
		for i, d := range list.Items {
			res[i] = d
		}
	}
	return
}

// PipelineConfig is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type PipelineConfig struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec      devopsv1alpha1.PipelineConfigSpec   `json:"spec"`
	Status    devopsv1alpha1.PipelineConfigStatus `json:"status"`
	Pipelines []pipeline.Pipeline                 `json:"pipelines"`
}

// GetObjectMeta object meta
func (p PipelineConfig) GetObjectMeta() api.ObjectMeta {
	return p.ObjectMeta
}

// CreatePipelineConfigDetail create pipeline config detail
func CreatePipelineConfigDetail(client devopsclient.Interface, spec *PipelineConfigDetail) (*devopsv1alpha1.PipelineConfig, error) {
	if spec == nil {
		return nil, nil
	}
	config := &devopsv1alpha1.PipelineConfig{
		TypeMeta: metaV1.TypeMeta{
			Kind:       "PipelineConfig",
			APIVersion: devopsv1alpha1.APIVersionV1Alpha1,
		},
		ObjectMeta: metaV1.ObjectMeta{
			Name:        spec.ObjectMeta.Name,
			Namespace:   spec.ObjectMeta.Namespace,
			Labels:      spec.ObjectMeta.Labels,
			Annotations: spec.ObjectMeta.Annotations,
		},
		Spec: spec.PipelineConfig.Spec,
		Status: devopsv1alpha1.PipelineConfigStatus{
			Phase: devopsv1alpha1.PipelineConfigPhaseCreating, // initial phase should be creating
		},
	}

	err := handleSpec(client, config, spec.PipelineConfig.Spec.Strategy.Template)
	if err == nil {
		namespace := spec.ObjectMeta.Namespace
		config, err = client.DevopsV1alpha1().PipelineConfigs(namespace).Create(config)
		if err != nil {
			return nil, err
		}
	}

	return config, err
}

func handleSpec(client devopsclient.Interface, config *devopsv1alpha1.PipelineConfig, template *devopsv1alpha1.PipelineConfigTemplate) (err error) {
	configTemplate := template
	if configTemplate != nil {
		name := configTemplate.Name
		namespace := configTemplate.Namespace

		kind := configTemplate.Kind
		switch kind {
		case "ClusterPipelineTemplate":
			clusterPipelineTemplate, err := client.DevopsV1alpha1().ClusterPipelineTemplates().Get(name, api.GetOptionsInCache)

			if err == nil {
				handleTemplateInstance(client, namespace, &clusterPipelineTemplate.DeepCopy().Spec, config, configTemplate, getClusterTaskTemplate)
			}
		case "PipelineTemplate":
			pipelineTemplate, err := client.DevopsV1alpha1().PipelineTemplates(namespace).Get(name, api.GetOptionsInCache)

			if err == nil {
				handleTemplateInstance(client, namespace, &pipelineTemplate.DeepCopy().Spec, config, configTemplate, getTaskTemplate)
			}
		default:
			return fmt.Errorf("unknow template kind: %s", kind)
		}

		if category, ok := configTemplate.GetObjectMeta().GetLabels()["category"]; ok && category != "" {
			if config.Labels == nil {
				config.Labels = make(map[string]string)
			}
			config.Labels["category"] = category

			log.Println("pipeline template category:", category)
		} else {
			if config.Status.Conditions == nil {
				config.Status.Conditions = []devopsv1alpha1.Condition{}
			}

			config.Status.Conditions = append(config.Status.Conditions, devopsv1alpha1.Condition{
				Message: "template's category is empty or don't exists.",
			})

			log.Println("template labels:", configTemplate.Labels)
		}
	}

	return
}

func getTaskTemplate(client devopsclient.Interface, namespace string, taskName string) (*devopsv1alpha1.PipelineTaskTemplateSpec, error) {
	taskTemplate, err := client.DevopsV1alpha1().PipelineTaskTemplates(namespace).Get(taskName, api.GetOptionsInCache)
	if err == nil {
		return &taskTemplate.Spec, nil
	}
	return nil, err
}

func getClusterTaskTemplate(client devopsclient.Interface, namespace string, taskName string) (*devopsv1alpha1.PipelineTaskTemplateSpec, error) {
	log.Printf("skip namespace: %s, taskName %s", namespace, taskName)
	taskTemplate, err := client.DevopsV1alpha1().ClusterPipelineTaskTemplates().Get(taskName, api.GetOptionsInCache)
	if err == nil {
		return &taskTemplate.Spec, nil
	}
	return nil, err
}

func handleTemplateInstance(client devopsclient.Interface, namespace string, templateSpec *devopsv1alpha1.PipelineTemplateSpec, config *devopsv1alpha1.PipelineConfig, configTemplate *devopsv1alpha1.PipelineConfigTemplate,
	getTaskSpec func(devopsclient.Interface, string, string) (*devopsv1alpha1.PipelineTaskTemplateSpec, error)) {
	for i, param := range templateSpec.Parameters {
		param.Value = configTemplate.Spec.Parameters[i].Value

		templateSpec.Parameters[i] = param
	}
	for i, arg := range templateSpec.Arguments {
		for j, item := range arg.Items {
			item.Value = configTemplate.Spec.Arguments[i].Items[j].Value
			arg.Items[j] = item
		}
		templateSpec.Arguments[i] = arg
	}

	envs := []devopsv1alpha1.PipelineEnvironment{
		{
			Name:  "ALAUDA_PROJECT",
			Value: config.Namespace,
		},
	}
	config.Spec.Strategy.Template.Spec.Environments = envs

	config.Spec.Strategy.Template.Spec.Dependencies = &devopsv1alpha1.PipelineDependency{
		Plugins: []devopsv1alpha1.JenkinsPlugin{},
	}

	for i, stage := range config.Spec.Strategy.Template.Spec.Stages {
		for j, task := range stage.Tasks {
			task.ObjectMeta.Name = templateSpec.Stages[i].Tasks[j].Name
			task.Spec.Type = templateSpec.Stages[i].Tasks[j].Type
			task.Spec.Relation = templateSpec.Stages[i].Tasks[j].Relation
			task.Spec.Approve = templateSpec.Stages[i].Tasks[j].Approve
			task.Spec.Agent = templateSpec.Stages[i].Tasks[j].Agent
			task.Spec.Environments = templateSpec.Stages[i].Tasks[j].Environments

			taskSpec, err := getTaskSpec(client, namespace, task.Name)
			if err == nil {
				task.Spec.Body = taskSpec.Body

				task.Spec.Arguments = []devopsv1alpha1.PipelineTemplateArgument{}
				for _, arg := range taskSpec.Arguments {
					if arg.Display.Description.En == "" {
						arg.Display.Description.En = arg.Display.Name.En
					}
					if arg.Display.Description.Zh == "" {
						arg.Display.Description.Zh = arg.Display.Name.Zh
					}

					task.Spec.Arguments = append(task.Spec.Arguments, devopsv1alpha1.PipelineTemplateArgument{
						Name:    arg.Name,
						Schema:  arg.Schema,
						Display: arg.Display,
					})
				}

				if taskSpec.Dependencies != nil && taskSpec.Dependencies.Plugins != nil {
					config.Spec.Strategy.Template.Spec.Dependencies.Plugins =
						append(config.Spec.Strategy.Template.Spec.Dependencies.Plugins, taskSpec.Dependencies.Plugins...)
				}
			} else {
				glog.Errorf("getTaskSpec error: %v", err)
			}

			stage.Tasks[j] = task
		}
		config.Spec.Strategy.Template.Spec.Stages[i] = stage
	}

	config.Spec.Strategy.Template.Spec.Agent = templateSpec.Agent
	config.Spec.Strategy.Template.Spec.Parameters = templateSpec.Parameters
	config.Spec.Strategy.Template.Spec.Arguments = templateSpec.Arguments
}

// GetPipelineConfigList returns a PipelineConfigList
func GetPipelineConfigList(client devopsclient.Interface,
	namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*PipelineConfigList, error) {
	log.Println("Getting list of pipelineconfigs")
	var (
		configCritical, pipelineCritical error
		configNonCritical                []error
		pipelineConfigList               *devopsv1alpha1.PipelineConfigList
		pipelineList                     *devopsv1alpha1.PipelineList
		wait                             sync.WaitGroup
	)

	// fetch all PipelineConfig
	pipelineConfigList, configCritical = client.DevopsV1alpha1().PipelineConfigs(namespace.ToRequestParam()).List(api.ListEverything)
	configNonCritical, configCritical = errors.HandleError(configCritical)
	if configCritical != nil {
		glog.Errorf("error while listing pipeline configs: %v", configCritical)
		return nil, configCritical
	}

	// filter and page PipelineConfig
	resultConfigs := &PipelineConfigList{
		Items:    make([]PipelineConfig, 0),
		ListMeta: api.ListMeta{TotalItems: len(pipelineConfigList.Items)},
	}

	configCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(pipelineConfigList.Items), dsQuery)
	configs := fromCells(configCells)
	resultConfigs.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	resultConfigs.Errors = configNonCritical
	// prevent sync between different goroutine, we will declare all elements in array
	resultConfigs.Items = make([]PipelineConfig, len(configs))

	log.Println("filteredTotal:", filteredTotal)

	// fetch list of Pipeline triggered by the PipelineConfigs in current page
	wait = sync.WaitGroup{}
	for i, conf := range configs {
		wait.Add(1)
		go func(index int, conf devopsv1alpha1.PipelineConfig, resultList *PipelineConfigList) {
			defer wait.Done()

			var (
				pipelines   []devopsv1alpha1.Pipeline
				listOptions = metaV1.ListOptions{
					LabelSelector:   getPipelineConfigSelector(conf.GetName()).String(),
					ResourceVersion: "0",
				}
			)

			pipelineList, pipelineCritical = client.DevopsV1alpha1().Pipelines(namespace.ToRequestParam()).List(listOptions)
			_, pipelineCritical = errors.HandleError(pipelineCritical)
			if pipelineCritical != nil {
				glog.Errorf("error while listing pipelines: %v", pipelineCritical)
			} else {
				pipelines = pipelineList.Items
			}
			glog.V(7).Infof("pipeline's count is %d in pipelineConfig %s", len(pipelineList.Items), conf.GetName())

			resultList.Items[index] = toPipelineConfig(conf, pipelines)
		}(i, conf, resultConfigs)
	}
	wait.Wait()

	return sortPipelineConfigList(resultConfigs, dsQuery), nil
}

// getPipelineConfigSelector get label selector by pipelineConfig
func getPipelineConfigSelector(name string) labels.Selector {
	selector := labels.NewSelector()
	req, _ := labels.NewRequirement("pipelineConfig", selection.DoubleEquals, []string{name})
	selector = selector.Add(*req)
	return selector
}

// isPipelineSortedAsc sort the pipeline asc or not
func isPipelineSortedAsc(dsQuery *dataselect.DataSelectQuery) (bool, bool) {
	var isSortedByPipelineCreatedAt, sortedAscending bool
	if dsQuery != nil && dsQuery.SortQuery != nil && len(dsQuery.SortQuery.SortByList) > 0 {
		for _, sortBy := range dsQuery.SortQuery.SortByList {
			if sortBy.Property == dataselect.PipelineCreationTimestampProperty {
				isSortedByPipelineCreatedAt = true
				sortedAscending = sortBy.Ascending
				break
			}
		}
	}

	return isSortedByPipelineCreatedAt, sortedAscending
}

func sortByCreationTime(configList *PipelineConfigList, asc bool) {
	sort.SliceStable(configList.Items, func(i, j int) bool {
		before := configList.Items[i].Pipelines
		after := configList.Items[j].Pipelines

		if asc {
			if len(before) == 0 {
				return true
			}
			if len(after) == 0 {
				return false
			}
			return !before[0].GetObjectMeta().CreationTimestamp.After(after[0].GetObjectMeta().CreationTimestamp.Time)
		}

		if len(before) == 0 {
			return false
		}
		if len(after) == 0 {
			return true
		}
		return before[0].GetObjectMeta().CreationTimestamp.After(after[0].GetObjectMeta().CreationTimestamp.Time)
	})
}

func sortByName(configList *PipelineConfigList, asc bool) {
	sort.SliceStable(configList.Items, func(i, j int) bool {
		before := configList.Items[i]
		after := configList.Items[j]

		order := (strings.Compare(before.GetObjectMeta().Name, after.GetObjectMeta().Name) > 0)
		if asc {
			return !order
		}

		return order
	})
}

// sortPipelineConfigList sort PipelineConfigList by pipeline CreationTimestamp
func sortPipelineConfigList(configList *PipelineConfigList, dsQuery *dataselect.DataSelectQuery) *PipelineConfigList {
	sortByNameAsc := true
	if dsQuery != nil && dsQuery.SortQuery != nil && len(dsQuery.SortQuery.SortByList) > 0 {
		for _, sortBy := range dsQuery.SortQuery.SortByList {
			if sortBy.Property == dataselect.PipelineCreationTimestampProperty {
				sortByCreationTime(configList, sortBy.Ascending)
				// break
			} else if sortBy.Property == dataselect.NameProperty {
				sortByNameAsc = sortBy.Ascending
			}
		}
	}

	sortByName(configList, sortByNameAsc)

	return configList
}

// toPipelineConfig append pipelines sorted by CreationTimestamp to PipelineConfig
func toPipelineConfig(config devopsv1alpha1.PipelineConfig, pipelines []devopsv1alpha1.Pipeline) PipelineConfig {
	maxLen := 5
	pipelineConfig := PipelineConfig{
		ObjectMeta: api.NewObjectMeta(config.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindPipelineConfig),
		Pipelines:  make([]pipeline.Pipeline, 0, maxLen),
		// data here
		Spec:   config.Spec,
		Status: config.Status,
	}
	if pipelines != nil && len(pipelines) > 0 {
		// sorted by pipeline creation timestamp desc
		sort.SliceStable(pipelines, func(i, j int) bool {
			if kind, ok := config.Labels[devopsv1alpha1.LabelPipelineKind]; ok && kind == devopsv1alpha1.LabelPipelineKindMultiBranch {
				if pipelines[i].GetObjectMeta().GetCreationTimestamp().Time.Equal(pipelines[j].GetObjectMeta().GetCreationTimestamp().Time) {
					return pipelines[i].Annotations[common.AnnotationsKeyMultiBranchName] > pipelines[j].Annotations[common.AnnotationsKeyMultiBranchName]
				}
				return pipelines[i].GetObjectMeta().GetCreationTimestamp().After(pipelines[j].GetObjectMeta().GetCreationTimestamp().Time)
			}
			return comparePipeline(pipelines[i], pipelines[j])
		})

		// only return the first five data
		for _, p := range pipelines {
			if len(pipelineConfig.Pipelines) >= maxLen {
				break
			}

			pipelineConfig.Pipelines = append(pipelineConfig.Pipelines, pipeline.ToPipeline(p))
		}
	}
	return pipelineConfig
}

func GenerateFromCore(app appCore.Application) ([]PipelineConfig, error) {
	result := make([]PipelineConfig, 0)
	pipelineConfigList, err := GetFormCore(app)
	if err != nil {
		return result, err
	}
	pipelines := make([]devopsv1alpha1.Pipeline, 0)
	for _, config := range pipelineConfigList {
		result = append(result, toPipelineConfig(config, pipelines))
	}
	return result, nil
}

func GetFormCore(app appCore.Application) ([]devopsv1alpha1.PipelineConfig, error) {
	list := make([]devopsv1alpha1.PipelineConfig, 0)
	for _, r := range app.Resources {
		if strings.ToLower(r.GetKind()) == api.ResourceKindPipelineConfig {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*devopsv1alpha1.PipelineConfig, error) {
	if unstr == nil {
		return nil, goErrors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &devopsv1alpha1.PipelineConfig{}
	err = json.Unmarshal(data, output)
	return output, err
}

func GetPipelineConfigListAsResourceList(client devopsclient.Interface, namespace string, dsQuery *dataselect.DataSelectQuery) (items []common.ResourceItem) {
	items = []common.ResourceItem{}
	pipelineConfigs, depErr := GetPipelineConfigList(client, common.NewSameNamespaceQuery(namespace), dsQuery)
	if depErr != nil {
		log.Println(fmt.Sprintf("fetch pipelineconfigs in %s by dsQuery %v; err: %v", namespace, dsQuery, depErr))
	}

	if pipelineConfigs == nil || len(pipelineConfigs.Items) == 0 {
		return
	}

	for _, item := range pipelineConfigs.Items {
		items = append(items, common.ResourceItem{
			Name:      item.ObjectMeta.Name,
			Namespace: item.ObjectMeta.Namespace,
			Kind:      string(item.TypeMeta.Kind),
		})
	}
	return
}
