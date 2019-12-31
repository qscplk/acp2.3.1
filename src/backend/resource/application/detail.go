package application

import (
	"encoding/json"
	"errors"
	"log"
	"sort"
	"strings"
	"time"

	appCore "alauda.io/app-core/pkg/app"

	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/daemonset"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/deployment"
	"alauda.io/diablo/src/backend/resource/pipelineconfig"
	"alauda.io/diablo/src/backend/resource/statefulset"
	apps "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	client "k8s.io/client-go/kubernetes"
)

// ApplicationDetail sets a definition for applicationdetail
type ApplicationDetail struct {
	ObjectMeta   api.ObjectMeta                   `json:"objectMeta"`
	Description  string                           `json:"description"`
	Deployments  *[]deployment.DeploymentDetail   `json:"deployments"`
	Daemonsets   *[]daemonset.DaemonSetDetail     `json:"daemonsets"`
	StatefulSets *[]statefulset.StatefulSetDetail `json:"statefulsets"`
	// TODO: Change pipeline to definition when present
	Pipelines *[]pipelineconfig.PipelineConfig `json:"pipelines"`
	// Configmaps []configmap.ConfigMapDetail `json:"configmaps"`
	Others UnstructuredSlice `json:"others"`
}

func getLabelQuery(name string) *dataselect.DataSelectQuery {
	return dataselect.NewDataSelectQuery(
		dataselect.NoPagination, dataselect.NoSort,
		dataselect.NewFilterQuery([]string{dataselect.LabelProperty, "app:" + name}),
		dataselect.StandardMetrics,
	)
}

func getNamespaceQuery(namespace string) *common.NamespaceQuery {
	return common.NewNamespaceQuery([]string{namespace})
}

func GetApplicationDetail(k8sclient client.Interface, namespace, name string,
	appCoreClient *appCore.ApplicationClient, metricClient metricapi.MetricClient, dclient devopsclient.Interface) (application *ApplicationDetail, err error) {
	log.Print("Getting detail for application", namespace+"/"+name)
	rc, _, criticalError := common.GetRelationResource(k8sclient, namespace)
	if criticalError != nil {
		return application, criticalError
	}
	app, result := appCoreClient.GetApplication(namespace, name)
	if len(result.Errors()) != 0 {
		errString, err := json.Marshal(result.Errors())
		if err != nil {
			return application, err
		}
		return application, errors.New(string(errString))
	}
	deploymentList, err := deployment.GenerateDetailFromCore(*app, k8sclient, rc)
	if err != nil {
		return application, err
	}
	daemonSetList, err := daemonset.GenerateDetailFromCore(*app, rc)
	if err != nil {
		return application, err
	}
	statefulSetList, err := statefulset.GenerateDetailFromCore(*app, rc)
	if err != nil {
		return application, err
	}
	pipelineconfigList, err := pipelineconfig.GenerateFromCore(*app)
	if err != nil {
		return application, err
	}
	pipelineconfigList = getPipelineCofgByLabel(dclient, namespace, name, pipelineconfigList)
	application = &ApplicationDetail{
		ObjectMeta:   api.NewObjectMetaSplit(name, namespace, nil, nil, time.Now()),
		Description:  app.GetDisplayName(common.GetLocalBaseDomain()),
		Deployments:  deploymentList,
		Daemonsets:   daemonSetList,
		StatefulSets: statefulSetList,
		// TODO: Change pipeline to definition when present
		Pipelines: &pipelineconfigList,
		// Configmaps []configmap.ConfigMapDetail `json:"configmaps"`
		Others: getResources(*app),
	}
	return
}

func getPipelineCofgByLabel(dclient devopsclient.Interface, namespace, appName string, oList []pipelineconfig.PipelineConfig) []pipelineconfig.PipelineConfig {
	//todo short time used for pipeline
	pList, err := pipelineconfig.GetPipelineConfigList(dclient, getNamespaceQuery(namespace), getLabelQuery(appName))
	if err != nil {
		return oList
	}
	if len(pList.Items) == 0 {
		return oList
	}

	oldMap := make(map[string]bool)
	for _, data := range oList {
		oldMap[data.ObjectMeta.Name] = true
	}
	for _, data := range pList.Items {
		if !oldMap[data.ObjectMeta.Name] {
			oList = append(oList, data)
		}
	}
	return oList
}

type UnstructuredSlice []unstructured.Unstructured

func (s UnstructuredSlice) Len() int      { return len(s) }
func (s UnstructuredSlice) Swap(i, j int) { s[i], s[j] = s[j], s[i] }
func (s UnstructuredSlice) Less(i, j int) bool {
	return s[i].GetName()+s[i].GetKind() < s[j].GetName()+s[j].GetKind()
}

func getResources(app appCore.Application) (unstructuredSlice UnstructuredSlice) {
	resources := app.Resources
	res := make([]unstructured.Unstructured, 0, len(resources))
	for _, r := range resources {
		if r.GetKind() == api.ResourceKindDeployment ||
			r.GetKind() == api.ResourceKindStatefulSet ||
			r.GetKind() == api.ResourceKindDaemonSet ||
			strings.ToLower(r.GetKind()) == api.ResourceKindPipelineConfig {
			continue
		}
		res = append(res, r)
	}
	unstructuredSlice = UnstructuredSlice(res)
	sort.Stable(unstructuredSlice)
	return
}

const (
	SourceUI   = "ui"
	SourceYaml = "yaml"
)

// ApplicationSpec struct
type ApplicationSpec struct {
	ObjectMeta  api.ObjectMeta `json:"objectMeta"`
	TypeMeta    api.TypeMeta   `json:"typeMeta"`
	Description string         `json:"description"`
	// used to create by api
	Deployments []deployment.DeploymentSpec `json:"deployments"`
	// used to create by yaml
	Resources []unstructured.Unstructured `json:"resources"`
	Source    string                      `json:"source"`
}

type ApplicationResponse struct {
	Application *appCore.Application `json:"application"`
	Result      *appCore.Result      `json:"result"`
}

func getUpdateApplicationResources(app *appCore.Application, namespace, name string, spec *ApplicationSpec) ([]unstructured.Unstructured, error) {
	newResources := make([]unstructured.Unstructured, 0, 2)
	combineResources := make([]unstructured.Unstructured, 0, 2)
	oldDemployments, err := deployment.GetFormCore(*app)
	if err != nil {
		return combineResources, err
	}
	oldDeployMap := make(map[string]apps.Deployment)
	for _, oldDeploy := range oldDemployments {
		oldDeployMap[common.GenKeyOfUnstructured(api.ResourceKindDeployment, oldDeploy.GetName())] = oldDeploy
	}

	//create deployment
	for _, deploy := range spec.Deployments {
		oldDeploy := oldDeployMap[common.GenKeyOfUnstructured(api.ResourceKindDeployment, deploy.ObjectMeta.Name)]
		yamlList, err := deployment.GenerateYaml(namespace, deploy, &oldDeploy)
		if err != nil {
			return combineResources, err
		}
		for _, yaml := range yamlList {
			newResources = append(newResources, yaml)
		}
	}
	combineReousrces := common.CombineResourceList(app.Resources, newResources)
	return combineReousrces, nil
}

func insertTimestamp(res *unstructured.Unstructured) error {
	switch res.GetKind() {
	case "Deployment", "DaemonSet", "StatefulSet":
		annotations, found, err := unstructured.NestedStringMap(
			res.Object,
			"spec", "template", "metadata", "annotations",
		)
		if err != nil {
			return err
		}
		if !found || annotations == nil {
			annotations = make(map[string]string)
		}
		annotations["updateTimestamp"] = time.Now().Format(time.RFC3339)
		err = unstructured.SetNestedStringMap(
			res.Object, annotations,
			"spec", "template", "metadata", "annotations",
		)
		if err != nil {
			return err
		}
	default:
		return nil
	}
	return nil
}

func UpdateApplication(appCoreClient *appCore.ApplicationClient, namespace, name string, spec *ApplicationSpec, isDryRun bool) (*ApplicationResponse, error) {
	log.Println("update application: " + namespace + "/" + name)
	app, result := appCoreClient.GetApplication(namespace, name)
	err := result.CombineError()
	if err != nil {
		return nil, err
	}
	if app.GetDisplayName(common.GetLocalBaseDomain()) != spec.Description {
		app, err = appCoreClient.UpdateApplicationDisplayName(namespace, name, spec.Description)
		if err != nil {
			return nil, err
		}
	}
	resources, err := getUpdateApplicationResources(app, namespace, name, spec)

	if err != nil {
		return nil, err
	}

	for _, res := range resources {
		err = insertTimestamp(&res)
		if err != nil {
			return nil, err
		}
	}

	if isDryRun {
		app := &appCore.Application{
			Resources: resources,
		}
		return &ApplicationResponse{
			Application: app,
		}, nil
	}
	retryoption := appCore.ApplicationUpdateOptions{
		UpdateConflictMaxRetry: 2,
	}
	app, result = appCoreClient.UpdateApplication(namespace, name, &resources, retryoption)
	if result.CombineError() != nil {
		return nil, result.CombineError()
	}
	return &ApplicationResponse{
		Application: app,
		Result:      result,
	}, nil
}

func CreateApplication(appCoreClient *appCore.ApplicationClient, namespace string, spec *ApplicationSpec, isDryRun bool) (*ApplicationResponse, error) {

	appInfo := appCore.ApplicationInfo{
		Name:        spec.ObjectMeta.Name,
		Namespace:   namespace,
		DisplayName: spec.Description,
	}
	if spec.Source == SourceYaml {
		return CreateApplicationByYaml(appCoreClient, namespace, appInfo, spec.Resources)
	}
	log.Println("create application: " + namespace + "/" + spec.ObjectMeta.Name)
	resources := make([]unstructured.Unstructured, 0, 2)

	//create deployment
	for _, deploy := range spec.Deployments {
		yamlList, err := deployment.GenerateYaml(namespace, deploy, nil)
		if err != nil {
			return nil, err
		}
		for _, yaml := range yamlList {
			resources = append(resources, yaml)
		}
	}
	if isDryRun {
		app := &appCore.Application{
			Resources: resources,
		}
		return &ApplicationResponse{
			Application: app,
		}, nil
	}

	return CreateApplicationByYaml(appCoreClient, namespace, appInfo, resources)
}

func CreateApplicationByYaml(appCoreClient *appCore.ApplicationClient, namespace string, appInfo appCore.ApplicationInfo, resources []unstructured.Unstructured) (*ApplicationResponse, error) {
	log.Println("start create application by yaml")
	if len(resources) == 0 {
		return nil, errors.New("no resource to generate")
	}
	app, result := appCoreClient.CreateApplication(&appInfo, &resources, true)
	log.Println("finish create application by yaml")
	return &ApplicationResponse{
		Application: app,
		Result:      result,
	}, nil
}
