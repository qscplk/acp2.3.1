package policy

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/gogo/protobuf/jsonpb"
	istio "istio.io/api/authentication/v1alpha1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

func mapToSpec(m map[string]interface{}) (*istio.Policy, error) {
	var data []byte
	var err error

	if data, err = json.Marshal(m); err != nil {
		return nil, err
	}

	policy := &istio.Policy{}
	if err = jsonpb.UnmarshalString(string(data[:]), policy); err != nil {
		return nil, err
	}
	return policy, nil
}

func PolicySpecToMap(spec *istio.Policy) (map[string]interface{}, error) {
	var data string
	var err error

	jMarsher := jsonpb.Marshaler{}
	if data, err = jMarsher.MarshalToString(spec); err != nil {
		return nil, err
	}

	var m map[string]interface{}
	if err = json.Unmarshal([]byte(data), &m); err != nil {
		return nil, err
	}
	return m, nil
}

type PolicyValidator struct {
	policy *unstructured.Unstructured
	spec   *istio.Policy
}

func (v *PolicyValidator) setup() error {
	var spec *istio.Policy
	var err error
	if spec, err = mapToSpec(v.policy.Object["spec"].(map[string]interface{})); err != nil {
		return err
	}
	v.spec = spec
	return nil
}

func (v *PolicyValidator) orderedValidateFuncs() []func() error {
	return []func() error{
		v.validateKind,
	}
}

func (v *PolicyValidator) validateKind() error {
	if v.policy.GetKind() != Kind {
		return fmt.Errorf("kind must be %s", Kind)
	}
	return nil
}

func (v *PolicyValidator) validate() error {
	for _, f := range v.orderedValidateFuncs() {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

func updateAnnotation(key, value string, usPolicy *unstructured.Unstructured) {
	annotations := usPolicy.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	annotations[key] = value
	usPolicy.SetAnnotations(annotations)
}

func validateUpdate(namespace string, name string, validator *PolicyValidator) error {
	if validator.policy.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}
	if validator.policy.GetName() != name {
		return errors.New("resource name not equal to path name")
	}

	return validator.validate()
}

func validateCreate(namespace string, validator *PolicyValidator) error {
	if validator.policy.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}
	return validator.validate()
}

func setCreateDefaultValues(namespace string, creator string, v *PolicyValidator) {
	updateAnnotation(annotationKey("creator"), creator, v.policy)
	if v.policy.GetNamespace() == "" {
		v.policy.SetNamespace(namespace)
	}
}

func setUpdateDefaultValues(namespace string, v *PolicyValidator) {
	if v.policy.GetNamespace() == "" {
		v.policy.SetNamespace(namespace)
	}
}

func CreatePolicy(dyclient dynamic.NamespaceableResourceInterface, namespace string, creator string, usPolicy *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	validator := PolicyValidator{policy: usPolicy}
	err := validator.setup()
	if err != nil {
		return nil, err
	}
	//fill default val
	setCreateDefaultValues(namespace, creator, &validator)
	//valigate resource
	if err := validateCreate(namespace, &validator); err != nil {
		return nil, err
	}
	//convert spec back to unstructed
	validator.policy.Object["spec"], err = PolicySpecToMap(validator.spec)
	if err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Create(validator.policy, v1.CreateOptions{})
}

func UpdatePolicy(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string, usPolicy *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	validator := PolicyValidator{policy: usPolicy}
	err := validator.setup()
	if err != nil {
		return nil, err
	}
	setUpdateDefaultValues(namespace, &validator)
	if err := validateUpdate(namespace, name, &validator); err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Update(validator.policy, v1.UpdateOptions{})
}

func DeletePolicy(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) error {
	return dyclient.Namespace(namespace).Delete(name, &v1.DeleteOptions{})
}
