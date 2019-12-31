package gateway

import (
	"encoding/json"
	"errors"
	"fmt"

	istio "istio.io/api/networking/v1alpha3"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/dynamic"
)

func mapToSpec(m map[string]interface{}) (*istio.Gateway, error) {
	var data []byte
	var err error
	if data, err = json.Marshal(m); err != nil {
		return nil, err
	}
	gateWay := &istio.Gateway{}
	if err = json.Unmarshal(data, gateWay); err != nil {
		return nil, err
	}
	return gateWay, nil
}

func gatewaySpecToMap(spec *istio.Gateway) (map[string]interface{}, error) {
	var data []byte
	var err error
	if data, err = json.Marshal(spec); err != nil {
		return nil, err
	}
	var m map[string]interface{}
	if err = json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return m, nil
}

type gatewayValidator struct {
	gateway *unstructured.Unstructured
	spec    *istio.Gateway
}

func (v *gatewayValidator) setup() error {
	var spec *istio.Gateway
	var err error
	if spec, err = mapToSpec(v.gateway.Object["spec"].(map[string]interface{})); err != nil {
		return err
	}
	v.spec = spec
	return nil
}

func (v *gatewayValidator) orderedValidateFuncs() []func() error {
	return []func() error{
		v.validateKind,
	}
}

func (v *gatewayValidator) orderedFillValueFuncs() []func() error {
	return []func() error{
		v.fillGatewaySelector,
		v.fillGatewayServerPortName,
	}
}

func (v *gatewayValidator) validateKind() error {
	if v.gateway.GetKind() != Kind {
		return fmt.Errorf("kind must be %s", Kind)
	}
	return nil
}

func (v *gatewayValidator) fillGatewaySelector() error {
	if v.spec.Selector == nil {
		v.spec.Selector = make(map[string]string)
	}
	v.spec.Selector[SelectorGatewayKey] = SelectorGatewayValue
	return nil
}

func generateName(base string) string {
	maxNameLength := 63
	randomLength := 5
	maxGeneratedNameLength := maxNameLength - randomLength
	if len(base) > maxGeneratedNameLength {
		base = base[:maxGeneratedNameLength]
	}
	return fmt.Sprintf("%s%s", base, rand.String(randomLength))
}

func (v *gatewayValidator) fillGatewayServerPortName() error {
	for i, _ := range v.spec.Servers {
		// protocol  MUST BE one of HTTP|HTTPS|GRPC|HTTP2|MONGO|TCP|TLS.
		if v.spec.Servers[i].Port.Protocol == IstioServerProtocolHttp {
			v.spec.Servers[i].Port.Name = generateName(fmt.Sprintf("http-%d-", v.spec.Servers[i].Port.Number))
		} else if v.spec.Servers[i].Port.Protocol == IstioServerProtocolHttps {
			v.spec.Servers[i].Port.Name = generateName(fmt.Sprintf("https-%d-", v.spec.Servers[i].Port.Number))
		} else {
			v.spec.Servers[i].Port.Name = generateName(fmt.Sprintf("unknown-%d-", v.spec.Servers[i].Port.Number))
		}
	}
	return nil
}

func (v *gatewayValidator) fillDefaultValue() error {
	for _, f := range v.orderedFillValueFuncs() {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

func (v *gatewayValidator) validate() error {
	for _, f := range v.orderedValidateFuncs() {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

func updateAnnotation(key, value string, usGateway *unstructured.Unstructured) {
	annotations := usGateway.GetAnnotations()
	annotations[key] = value
	usGateway.SetAnnotations(annotations)
}

func validateUpdate(namespace string, name string, validator *gatewayValidator) error {
	if validator.gateway.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}
	if validator.gateway.GetName() != name {
		return errors.New("resource name not equal to path name")
	}

	return validator.validate()
}

func validateCreate(namespace string, validator *gatewayValidator) error {
	if validator.gateway.GetNamespace() != namespace {
		return errors.New("resource namespace not equal to path namespace")
	}
	return validator.validate()
}

func setCreateDefaultValues(namespace string, creator string, v *gatewayValidator) {
	updateAnnotation(annotationKey("creator"), creator, v.gateway)
	if v.gateway.GetNamespace() == "" {
		v.gateway.SetNamespace(namespace)
	}
	v.fillDefaultValue()
}

func setUpdateDefaultValues(namespace string, v *gatewayValidator) {
	if v.gateway.GetNamespace() == "" {
		v.gateway.SetNamespace(namespace)
	}
}

func CreateGateway(dyclient dynamic.NamespaceableResourceInterface, namespace string, creator string, usGateway *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	validator := gatewayValidator{gateway: usGateway}
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
	validator.gateway.Object["spec"], err = gatewaySpecToMap(validator.spec)
	if err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Create(validator.gateway, v1.CreateOptions{})
}

func UpdateGateway(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string, usGateway *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	validator := gatewayValidator{gateway: usGateway}
	err := validator.setup()
	if err != nil {
		return nil, err
	}
	setUpdateDefaultValues(namespace, &validator)
	if err := validateUpdate(namespace, name, &validator); err != nil {
		return nil, err
	}
	return dyclient.Namespace(namespace).Update(validator.gateway, v1.UpdateOptions{})
}

func DeleteGateway(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) error {
	return dyclient.Namespace(namespace).Delete(name, &v1.DeleteOptions{})
}
