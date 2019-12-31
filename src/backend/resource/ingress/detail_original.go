package ingress

import (
	"encoding/json"
	"errors"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	extensions "k8s.io/api/extensions/v1beta1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type CreateIngressSpec struct {
	ObjectMeta api.ObjectMeta               `json:"objectMeta"`
	TypeMeta   api.TypeMeta                 `json:"typeMeta"`
	Host       string                       `json:"host"`
	Paths      []extensions.HTTPIngressPath `json:"paths"`
}

// GenerateYaml func
func GenerateYaml(spec CreateIngressSpec) (yaml *unstructured.Unstructured, err error) {
	objectMeta := metaV1.ObjectMeta{
		Name:        spec.ObjectMeta.Name,
		Namespace:   spec.ObjectMeta.Namespace,
		Labels:      spec.ObjectMeta.Labels,
		Annotations: spec.ObjectMeta.Annotations,
	}
	typeMeta := metaV1.TypeMeta{
		Kind:       api.ResourceKindIngress,
		APIVersion: IngressAPIVersion,
	}
	rules := make([]extensions.IngressRule, 0, 1)
	rule := extensions.IngressRule{
		Host: spec.Host,
		IngressRuleValue: extensions.IngressRuleValue{
			HTTP: &extensions.HTTPIngressRuleValue{
				Paths: spec.Paths,
			},
		},
	}
	rules = append(rules, rule)
	iSpec := extensions.IngressSpec{
		Rules: rules,
	}
	resource := extensions.Ingress{
		ObjectMeta: objectMeta,
		TypeMeta:   typeMeta,
		Spec:       iSpec,
	}
	return common.ConvertResourceToUnstructured(&resource)
}

func GetFormCore(app appCore.Application) ([]extensions.Ingress, error) {
	list := make([]extensions.Ingress, 0)
	for _, r := range app.Resources {
		if r.GetKind() == api.ResourceKindIngress {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*extensions.Ingress, error) {
	if unstr == nil {
		return nil, errors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &extensions.Ingress{}
	err = json.Unmarshal(data, output)
	return output, err
}
