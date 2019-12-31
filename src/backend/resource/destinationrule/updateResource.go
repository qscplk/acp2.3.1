package destinationrule

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gogo/protobuf/jsonpb"
	istio "istio.io/api/networking/v1alpha3"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

type destinationRuleValidator struct {
	destinationRule *unstructured.Unstructured
	spec            *istio.DestinationRule
}

func mapToSpec(m map[string]interface{}) (*istio.DestinationRule, error) {
	var data []byte
	var err error
	if data, err = json.Marshal(m); err != nil {
		return nil, err
	}
	destinationrule := &istio.DestinationRule{}
	if err = jsonpb.UnmarshalString(string(data), destinationrule); err != nil {
		return nil, err
	}
	return destinationrule, nil
}

func (v *destinationRuleValidator) setup() error {
	var spec *istio.DestinationRule
	var err error
	if spec, err = mapToSpec(v.destinationRule.Object["spec"].(map[string]interface{})); err != nil {
		return err
	}
	v.spec = spec
	return nil
}

func (v *destinationRuleValidator) validateKind() error {

	if v.destinationRule.GetKind() != Kind {
		return fmt.Errorf("kind must be %s", Kind)
	}
	return nil
}

func (drv *destinationRuleValidator) orderedFuncs() []func() error {
	return []func() error{
		drv.setup,
		drv.validateKind,
	}
}

func (v *destinationRuleValidator) validate() error {
	for _, f := range v.orderedFuncs() {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

func validateUpdate(namespace string, name string, destinationrule *unstructured.Unstructured) error {
	if destinationrule.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}

	validator := destinationRuleValidator{destinationRule: destinationrule}
	return validator.validate()
}

func setUpdateDefaultValues(namespace string, destinationrule *unstructured.Unstructured) {
	if destinationrule.GetNamespace() == "" {
		destinationrule.SetNamespace(namespace)
	}
}

func UpdateDestinationRule(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string, destinationrule *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	setUpdateDefaultValues(namespace, destinationrule)
	if err := validateUpdate(namespace, name, destinationrule); err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Update(destinationrule, v1.UpdateOptions{})
}

func DeleteDestinationRule(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) error {
	return dyclient.Namespace(namespace).Delete(name, &v1.DeleteOptions{})
}
