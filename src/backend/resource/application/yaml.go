package application

import (
	"log"
	"sync"

	appCore "alauda.io/app-core/pkg/app"

	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

type resourceListHolder struct {
	Resources []runtime.Object
	lock      sync.RWMutex
}

func newResourceListHolder() *resourceListHolder {
	return &resourceListHolder{
		Resources: make([]runtime.Object, 0, 50),
		lock:      sync.RWMutex{},
	}
}

func (r *resourceListHolder) append(slice []runtime.Object) {
	r.lock.Lock()
	r.Resources = append(r.Resources, slice...)
	r.lock.Unlock()
}

type ApplicationYAML struct {
	Objects []unstructured.Unstructured `json:"resources"`
	Errors  []error                     `json:"errors"`
}

func GetApplicationYAML(appCoreClient appCore.ApplicationClient, metricsClient metricapi.MetricClient, namespace, name string) (appYaml *ApplicationYAML, err error) {
	log.Println("Getting application yaml: " + namespace + "/" + name)
	app, result := appCoreClient.GetApplication(namespace, name)
	appYaml = &ApplicationYAML{
		Objects: app.Resources,
		Errors:  result.Errors(),
	}
	return
}

type UpdateAppYAMLSpec struct {
	Resources []unstructured.Unstructured `json:"resources"`
}

type DeleteAppYAMLSpec struct {
	RemoveLabelResources []unstructured.Unstructured `json:"removeLabelResources"`
}

func DeleteApplicationYaml(appCoreClient appCore.ApplicationClient, namespace, name string, spec *DeleteAppYAMLSpec) ([]appCore.ResourceResult, error) {
	items := make([]appCore.GVKName, 0, len(spec.RemoveLabelResources))
	for _, resource := range spec.RemoveLabelResources {
		item := appCore.GVKName{
			Name:             resource.GetName(),
			GroupVersionKind: resource.GroupVersionKind(),
		}
		items = append(items, item)
	}
	result := appCoreClient.DeleteApplication(namespace, name, items)
	return result.Items, nil
}

func UpdateApplicationYAML(appCoreClient appCore.ApplicationClient, namespace, name string, spec *UpdateAppYAMLSpec) ([]appCore.ResourceResult, error) {
	// retrieving current yaml for comparisson:
	_, result := appCoreClient.UpdateApplication(namespace, name, &spec.Resources)
	return result.Items, nil
}
