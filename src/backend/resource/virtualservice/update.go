package virtualservice

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

func mapToSpec(m map[string]interface{}) (*istio.VirtualService, error) {
	var data []byte
	var err error
	if data, err = json.Marshal(m); err != nil {
		return nil, err
	}
	vs := &istio.VirtualService{}
	if err = jsonpb.UnmarshalString(string(data[:]), vs); err != nil {
		return nil, err
	}
	return vs, nil
}

type virtualServiceValidator struct {
	virtualservice *unstructured.Unstructured
	spec           *istio.VirtualService
	disabled       bool
}

func (v *virtualServiceValidator) setup() error {
	var spec *istio.VirtualService
	var err error
	if spec, err = mapToSpec(v.virtualservice.Object["spec"].(map[string]interface{})); err != nil {
		return err
	}
	v.spec = spec
	v.disabled = v.isDisabled()
	return nil
}

func (v *virtualServiceValidator) isDisabled() bool {
	disabledStr := v.virtualservice.GetAnnotations()[annotationKey("disabled")]
	return disabledStr != "" && disabledStr != "false"
}

func (v *virtualServiceValidator) orderedFuncs() []func() error {
	return []func() error{
		v.setup,
		v.validateKind,
		v.validateHosts,
		v.validateHttpRouter,
	}
}

func (v *virtualServiceValidator) validateKind() error {

	if v.virtualservice.GetKind() != Kind {
		return fmt.Errorf("kind must be %s", Kind)
	}
	return nil
}

func (v *virtualServiceValidator) validateHosts() error {
	// do not check the host, when the virtual service is not disabled.
	if !v.disabled {
		return nil
	}
	annotationHostsStr := v.virtualservice.GetAnnotations()[annotationKey("hosts")]
	var annotationHosts []string

	var err error
	if err = json.Unmarshal([]byte(annotationHostsStr), &annotationHosts); err != nil {
		return fmt.Errorf("annotation hosts invalid: %s", err.Error())
	}
	if len(annotationHosts) != len(v.spec.Hosts) {
		return fmt.Errorf("annotation hosts count not equal to spec hosts count")
	}
	for i, host := range v.spec.Hosts {
		if host != disabledHostPrefix+annotationHosts[i] {
			return fmt.Errorf("annotation hosts not equal to spec hosts as index %d", i)
		}
	}
	return nil
}

func (v *virtualServiceValidator) validateHttpRouter() error {
	httpRouters := v.spec.Http
	if len(httpRouters) == 0 {
		return fmt.Errorf("http route is required")
	}
	for _, router := range httpRouters {
		weightSum := 0
		if len(router.Route) == 0 {
			return fmt.Errorf("destination in route is required")
		}
		if len(router.Route) == 1 {
			continue
		}
		for _, dest := range router.Route {
			weightSum += int(dest.Weight)
		}
		if weightSum != 100 {
			return fmt.Errorf("weight sum is %d != 100", weightSum)
		}
	}
	return nil
}

func (v *virtualServiceValidator) validate() error {
	for _, f := range v.orderedFuncs() {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

func updateAnnotation(key, value string, vs *unstructured.Unstructured) {
	annotations := vs.GetAnnotations()
	annotations[key] = value
	vs.SetAnnotations(annotations)
}

func validateCreate(namespace string, vs *unstructured.Unstructured) error {
	if vs.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}
	validator := virtualServiceValidator{virtualservice: vs}
	return validator.validate()
}
func validateUpdate(namespace string, name string, vs *unstructured.Unstructured) error {
	if vs.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}
	if vs.GetName() != name {
		return errors.New("resource name not equal to path name")
	}
	validator := virtualServiceValidator{virtualservice: vs}
	return validator.validate()
}

func setCreateDefaultValues(namespace string, creator string, vs *unstructured.Unstructured) {
	updateAnnotation(annotationKey("creator"), creator, vs)
	if vs.GetNamespace() == "" {
		vs.SetNamespace(namespace)
	}
}

func setUpdateDefaultValues(namespace string, vs *unstructured.Unstructured) {
	if vs.GetNamespace() == "" {
		vs.SetNamespace(namespace)
	}
}

func CreateVirtualService(dyclient dynamic.NamespaceableResourceInterface, namespace string, creator string, vs *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	setCreateDefaultValues(namespace, creator, vs)
	if err := validateCreate(namespace, vs); err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Create(vs, v1.CreateOptions{})
}

func UpdateVirtualService(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string, vs *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	setUpdateDefaultValues(namespace, vs)
	if err := validateUpdate(namespace, name, vs); err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Update(vs, v1.UpdateOptions{})
}

func DeleteVirtualService(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) error {
	return dyclient.Namespace(namespace).Delete(name, &v1.DeleteOptions{})
}
