package service

import (
	"encoding/json"
	"errors"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	core "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	client "k8s.io/client-go/kubernetes"
)

type CreateServiceSpec struct {
	ObjectMeta api.ObjectMeta     `json:"objectMeta"`
	Selector   map[string]string  `json:"selector"`
	Ports      []core.ServicePort `json:"ports"`
	Type       core.ServiceType   `json:"type"`
}

// GenerateYaml func
func GenerateYaml(spec CreateServiceSpec) (yaml *unstructured.Unstructured, err error) {
	objectMeta := metaV1.ObjectMeta{
		Name:        spec.ObjectMeta.Name,
		Namespace:   spec.ObjectMeta.Namespace,
		Labels:      spec.ObjectMeta.Labels,
		Annotations: spec.ObjectMeta.Annotations,
	}
	typeMeta := metaV1.TypeMeta{
		Kind:       api.ResourceKindService,
		APIVersion: ServiceAPIVersion,
	}
	sSpec := core.ServiceSpec{
		Selector: spec.Selector,
		Ports:    spec.Ports,
		Type:     spec.Type,
	}
	resource := core.Service{
		ObjectMeta: objectMeta,
		TypeMeta:   typeMeta,
		Spec:       sSpec,
	}
	return common.ConvertResourceToUnstructured(&resource)
}

func GetFormCore(app appCore.Application) ([]core.Service, error) {
	list := make([]core.Service, 0)
	for _, r := range app.Resources {
		if r.GetKind() == api.ResourceKindService {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*core.Service, error) {
	if unstr == nil {
		return nil, errors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &core.Service{}
	err = json.Unmarshal(data, output)
	return output, err
}

// GetOriginalList get original list from api
func GetOriginal(client client.Interface, namespace, name string) (service *core.Service, err error) {
	service, err = client.CoreV1().Services(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return
}
