package network

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/ingress"
	"alauda.io/diablo/src/backend/resource/service"
	core "k8s.io/api/core/v1"
	extensions "k8s.io/api/extensions/v1beta1"
	meta "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// NetworkInfo network infos for container
type NetworkInfo struct {
	ExternalNetworkInfos  []ExternalNetworkInfo  `json:"externalNetworkInfos"`
	InternalNetworkInfos  []InternalNetworkInfo  `json:"internalNetworkInfos"`
	ExternalNodePortInfos []ExternalNodePortInfo `json:"externalNodePortInfos"`
}

// ExternalNetworkInfo struct
type ExternalNetworkInfo struct {
	DomainPrefix string `json:"domainPrefix"`
	DomainName   string `json:"domainName"`
	Host         string `json:"host"`
	Path         string `json:"path"`
	TargetPort   int32  `json:"targetPort"`
	// the two fields will be empty when we create
	IngressName string    `json:"ingressName,omitempty"`
	ServiceName string    `json:"serviceName,omitempty"`
	CreatedAt   meta.Time `json:"createdAt"`
}

type ServiceBaseNetworkInfo struct {
	// the protocol is udp or tcp
	Protocol   string `json:"protocol"`
	SourcePort int32  `json:"sourcePort"`
	TargetPort int32  `json:"targetPort"`
	// the field will be empty when we create
	ServiceName string    `json:"serviceName,omitempty"`
	CreatedAt   meta.Time `json:"createdAt"`
}

// ExternalNodePortInfo struct
type ExternalNodePortInfo struct {
	ServiceBaseNetworkInfo `json:",inline"`
	// the NodePort
	NodePort int32 `json:"nodePort"`
}

// InternalNetworkInfo struct
type InternalNetworkInfo struct {
	ServiceBaseNetworkInfo `json:",inline"`
}

const (
	UDP           = "UDP"
	TCP           = "TCP"
	ProtocolCable = "-"
	InjectSidecar = "sidecar.istio.io/inject"
)

var IstioProtocals = []string{"TCP", "HTTP", "HTTPS", "GRPC", "HTTP2"}

func generateServiceName(name string, id string) string {
	if name == "" {
		return fmt.Sprintf("service-%s", id)
	}
	return name
}

func generateIngressName(name string, id string) string {
	if name == "" {
		return fmt.Sprintf("ingress-%s", id)
	}
	return name
}

func getExternalNetworkYaml(eni ExternalNetworkInfo, namespace string, templateLabels map[string]string, injectSidecar string) (yamlList []unstructured.Unstructured, err error) {
	yamlList = make([]unstructured.Unstructured, 0, 2)
	id, err := common.GetUUID()
	if err != nil {
		return yamlList, err
	}
	serviceName := generateServiceName(eni.ServiceName, id)
	ingressName := generateIngressName(eni.IngressName, id)
	ports := generateServicePorts(TCP, eni.TargetPort, intstr.IntOrString{Type: intstr.Int, IntVal: eni.TargetPort}, 0, serviceName)
	yaml, err := generateServiceYaml(serviceName, namespace, templateLabels, ports, true, core.ServiceTypeClusterIP, injectSidecar)
	if err != nil {
		return yamlList, err
	}
	yamlList = append(yamlList, *yaml)

	paths := generateIngressPath(serviceName, eni.Path, eni.TargetPort)
	yaml, err = generateIngressYaml(ingressName, namespace, eni.Host, paths, eni.DomainPrefix, eni.DomainName, injectSidecar)
	if err != nil {
		return yamlList, err
	}
	yamlList = append(yamlList, *yaml)
	return yamlList, nil
}

func getInternalNetworkYaml(ini InternalNetworkInfo, namespace string, templateLabels map[string]string, injectSidecar string) (yaml *unstructured.Unstructured, err error) {
	ports := generateServicePorts(ini.Protocol, ini.SourcePort, intstr.IntOrString{Type: intstr.Int, IntVal: ini.TargetPort}, 0, ini.ServiceName)
	yaml, err = generateServiceYaml(ini.ServiceName, namespace, templateLabels, ports, false, core.ServiceTypeClusterIP, injectSidecar)
	return yaml, err
}

func getNodePortNetworkYaml(enp ExternalNodePortInfo, namespace string, templateLabels map[string]string, injectSidecar string) (yaml *unstructured.Unstructured, err error) {
	enp.SourcePort = enp.TargetPort
	id, err := common.GetUUID()
	if err != nil {
		return yaml, err
	}
	enp.ServiceName = generateServiceName(enp.ServiceName, id)
	ports := generateServicePorts(enp.Protocol, enp.SourcePort, intstr.IntOrString{Type: intstr.Int, IntVal: enp.TargetPort}, enp.NodePort, enp.ServiceName)
	yaml, err = generateServiceYaml(enp.ServiceName, namespace, templateLabels, ports, false, core.ServiceTypeNodePort, injectSidecar)
	return yaml, err
}

// GenerateYaml func
func GenerateYaml(ni NetworkInfo, namespace string, templateLabels map[string]string, injectSidecar string) (yamlList []unstructured.Unstructured, err error) {
	yamlList = make([]unstructured.Unstructured, 0, 2*len(ni.ExternalNetworkInfos)+len(ni.InternalNetworkInfos)+len(ni.ExternalNodePortInfos))

	for _, eni := range ni.ExternalNetworkInfos {
		subYamlList, err := getExternalNetworkYaml(eni, namespace, templateLabels, injectSidecar)
		if err != nil {
			return yamlList, err
		}
		for _, yaml := range subYamlList {
			yamlList = append(yamlList, yaml)
		}
	}
	for _, ini := range ni.InternalNetworkInfos {
		yaml, err := getInternalNetworkYaml(ini, namespace, templateLabels, injectSidecar)
		if err != nil {
			return yamlList, err
		}
		yamlList = append(yamlList, *yaml)
	}
	for _, npi := range ni.ExternalNodePortInfos {
		yaml, err := getNodePortNetworkYaml(npi, namespace, templateLabels, injectSidecar)
		if err != nil {
			return yamlList, err
		}
		yamlList = append(yamlList, *yaml)
	}
	return yamlList, err
}

//set spec Port protocol and name
func setPortNameAndProtocol(protocol string, serviceName string) (core.Protocol, string) {
	// set protocol
	var serviceProtocol core.Protocol
	var portName string
	if strings.ToUpper(protocol) == UDP {
		serviceProtocol = core.ProtocolUDP
		// set port name meet the service protocol，default http,prefix istio service protocol,udp donot add prefix
		portName = ""
	} else {
		serviceProtocol = core.ProtocolTCP
		// tcp/udp set no port name
		portName = strings.ToLower(protocol) + ProtocolCable + serviceName
	}
	return serviceProtocol, portName
}

func generateServicePorts(protocol string, port int32, targePort intstr.IntOrString, nodePort int32, serviceName string) []core.ServicePort {
	PortElements := make([]core.ServicePort, 0)

	serviceProtocol, portName := setPortNameAndProtocol(protocol, serviceName)

	portElement := core.ServicePort{
		Name:       portName,
		Port:       port,
		TargetPort: targePort,
		Protocol:   serviceProtocol,
	}

	if nodePort != 0 {
		portElement.NodePort = nodePort
	}

	PortElements = append(PortElements, portElement)
	return PortElements
}

func generateServiceYaml(name, namespace string, templateLabels map[string]string, ports []core.ServicePort, needSystemAnno bool, serviceType core.ServiceType, injectSidecar string) (*unstructured.Unstructured, error) {

	spec := service.CreateServiceSpec{
		ObjectMeta: api.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Selector: templateLabels,
		Ports:    ports,
		Type:     serviceType,
	}

	if spec.ObjectMeta.Labels == nil {
		spec.ObjectMeta.Labels = make(map[string]string)
	}
	spec.ObjectMeta.Labels[InjectSidecar] = injectSidecar

	if needSystemAnno {
		annotations := make(map[string]string)
		annotations[getCreatorKey()] = SYSTEM
		spec.ObjectMeta.Annotations = annotations
	}
	return service.GenerateYaml(spec)
}

func generateIngressPath(serviceName, path string, sourcePort int32) []extensions.HTTPIngressPath {
	ingressPaths := make([]extensions.HTTPIngressPath, 0)
	ingressPath := extensions.HTTPIngressPath{
		Path: path,
		Backend: extensions.IngressBackend{
			ServiceName: serviceName,
			ServicePort: intstr.IntOrString{Type: intstr.Int, IntVal: sourcePort},
		},
	}
	ingressPaths = append(ingressPaths, ingressPath)
	return ingressPaths
}

func getPrefixKey() string {
	return fmt.Sprintf("app.%s/domain_prefix", common.GetLocalBaseDomain())
}

func getDomainKey() string {
	return fmt.Sprintf("app.%s/domain_name", common.GetLocalBaseDomain())
}

func generateIngressYaml(name, namespace, host string, paths []extensions.HTTPIngressPath, prefix, domainName string, injectSidecar string) (*unstructured.Unstructured, error) {
	annotations := make(map[string]string)
	annotations[getCreatorKey()] = SYSTEM
	annotations[getPrefixKey()] = prefix
	annotations[getDomainKey()] = domainName
	iSpec := ingress.CreateIngressSpec{
		ObjectMeta: api.ObjectMeta{
			Name:        name,
			Namespace:   namespace,
			Annotations: annotations,
		},
		Host:  host,
		Paths: paths,
	}

	if iSpec.ObjectMeta.Labels == nil {
		iSpec.ObjectMeta.Labels = make(map[string]string)
	}
	iSpec.ObjectMeta.Labels[InjectSidecar] = injectSidecar

	return ingress.GenerateYaml(iSpec)
}

func generateServiceInfoKey(si common.ServiceInfo) (keys []string) {
	keys = make([]string, 0, 2)
	portStr := strconv.Itoa(int(si.Port))
	keys = append(keys, generateKey(si.Namespace, si.Name, portStr))
	if si.PortName != "" {
		keys = append(keys, generateKey(si.Namespace, si.Name, si.PortName))
	}
	return
}

func generateKey(namespace, name, port string) string {
	return fmt.Sprintf("%s-%s-%s", namespace, name, port)
}

// get the completely service info, by the ingress data
func getServiceInfo(portMap map[string]common.ServiceInfo, namespace, name, port string) (common.ServiceInfo, bool) {
	key := generateKey(namespace, name, port)
	if val, ok := portMap[key]; ok {
		return val, true
	}
	return common.ServiceInfo{}, false
}

func fulfillMap(portMap *map[string]common.ServiceInfo, sis []common.ServiceInfo) {
	for _, si := range sis {
		keys := generateServiceInfoKey(si)
		for _, key := range keys {
			(*portMap)[key] = si
		}
	}
}

func GetNetworkResources(cs []core.Container, is []extensions.Ingress, ss []core.Service, namespace string, resourceSelector map[string]string) ([]unstructured.Unstructured, error) {
	rs := generateDeploymentNetworRelations(&cs, &is, &ss, namespace, resourceSelector)
	matchedResource := make([]unstructured.Unstructured, 0, 2)
	unstrMap := make(map[string]*unstructured.Unstructured)
	for _, i := range is {
		unstr, err := common.ConvertResourceToUnstructured(&i)
		if err != nil {
			return matchedResource, err
		}
		unstrMap[common.GetKeyOfUnstructured(unstr)] = unstr
	}
	for _, s := range ss {
		unstr, err := common.ConvertResourceToUnstructured(&s)
		if err != nil {
			return matchedResource, err
		}
		unstrMap[common.GetKeyOfUnstructured(unstr)] = unstr
	}

	for _, r := range rs {
		if r.isExternal() {
			ingresskey := common.GenKeyOfUnstructured(api.ResourceKindIngress, r.IngressData.Name)
			matchedResource = append(matchedResource, *unstrMap[ingresskey])
			serviceKey := common.GenKeyOfUnstructured(api.ResourceKindService, r.ServiceData.Name)
			matchedResource = append(matchedResource, *unstrMap[serviceKey])
		} else {
			serviceKey := common.GenKeyOfUnstructured(api.ResourceKindService, r.ServiceData.Name)
			matchedResource = append(matchedResource, *unstrMap[serviceKey])
		}
	}
	return matchedResource, nil
}

type VisitAddress struct {
	Internal []string `json:"internal"`
	External []string `json:"external"`
	NodePort []string `json:"nodeport"`
}

// jude protocol include some prefix
func portNameProtocol(name string) (string, bool) {
	if name != "" {
		for _, value := range IstioProtocals {
			protocolExist := value + ProtocolCable
			if strings.HasPrefix(strings.ToUpper(name), protocolExist) {
				return value, true
			}
		}
	}

	return "", false
}

func GetNetworkInfo(cs []core.Container, is []extensions.Ingress, ss []core.Service, namespace string, resourceSelector map[string]string) (NetworkInfo, VisitAddress) {
	rs := generateDeploymentNetworRelations(&cs, &is, &ss, namespace, resourceSelector)

	enis := make([]ExternalNetworkInfo, 0, 2)
	inis := make([]InternalNetworkInfo, 0, 2)
	npis := make([]ExternalNodePortInfo, 0, 2)
	internal := make([]string, 0, 2)
	external := make([]string, 0, 2)
	nodeport := make([]string, 0, 2)
	for _, r := range rs {
		if r.isExternal() {
			eni := ExternalNetworkInfo{
				DomainName:   r.IngressData.DomainName,
				DomainPrefix: r.IngressData.DomainPrefix,
				IngressName:  r.IngressData.Name,
				ServiceName:  r.ServiceData.Name,
				Host:         r.IngressData.Host,
				Path:         r.IngressData.Path.Path,
				TargetPort:   r.ControllerData.ContainerPort,
				CreatedAt:    r.ServiceData.CreatedAt,
			}
			enis = append(enis, eni)
			protocol := "http"
			if r.IngressData.IsHttps {
				protocol = "https"
			}
			external = append(external, fmt.Sprintf("%s://%s%s", protocol, eni.Host, eni.Path))
		} else {
			// set Protocol by istio service port name
			var portProtocol core.Protocol
			if protocol, ok := portNameProtocol(r.ServiceData.Port.Name); ok {
				portProtocol = core.Protocol(protocol)
			} else {
				portProtocol = r.ServiceData.Port.Protocol
			}

			svcBaseNetworkInfo := ServiceBaseNetworkInfo{
				ServiceName: r.ServiceData.Name,
				Protocol:    string(portProtocol),
				SourcePort:  r.ServiceData.Port.Port,
				TargetPort:  r.ControllerData.ContainerPort,
				CreatedAt:   r.ServiceData.CreatedAt,
			}
			if r.ServiceData.Type == core.ServiceTypeNodePort {
				npi := ExternalNodePortInfo{
					ServiceBaseNetworkInfo: svcBaseNetworkInfo,
					NodePort:               r.ServiceData.Port.NodePort,
				}
				nodeport = append(nodeport, fmt.Sprintf("%s://NODE-IP:%d", strings.ToLower(npi.Protocol), npi.NodePort))
				npis = append(npis, npi)
			} else if r.ServiceData.Type == core.ServiceTypeClusterIP {
				ini := InternalNetworkInfo{
					ServiceBaseNetworkInfo: svcBaseNetworkInfo,
				}
				internal = append(internal, fmt.Sprintf("%s://%s.%s:%d", strings.ToLower(ini.Protocol), ini.ServiceName, namespace, ini.SourcePort))
				inis = append(inis, ini)
			}

		}
	}
	return NetworkInfo{
			ExternalNetworkInfos:  enis,
			InternalNetworkInfos:  inis,
			ExternalNodePortInfos: npis,
		}, VisitAddress{
			External: external,
			Internal: internal,
			NodePort: nodeport,
		}
}

type UpdateNetworkSpec struct {
	Action                  string                `json:"action"`
	Type                    string                `json:"type"`
	OldExternalNetworkInfo  *ExternalNetworkInfo  `json:"oldExternalNetworkInfo,omitempty"`
	NewExternalNetworkInfo  *ExternalNetworkInfo  `json:"newExternalNetworkInfo,omitempty"`
	OldInternalNetworkInfo  *InternalNetworkInfo  `json:"oldInternalNetworkInfo,omitempty"`
	NewInternalNetworkInfo  *InternalNetworkInfo  `json:"newInternalNetworkInfo,omitempty"`
	OldExternalNodePortInfo *ExternalNodePortInfo `json:"oldExternalNodePortInfo,omitempty"`
	NewExternalNodePortInfo *ExternalNodePortInfo `json:"newExternalNodePortInfo,omitempty"`
}

type UpdateNetworkYaml struct {
	Action string                    `json:"action"`
	Yaml   unstructured.Unstructured `json:"yaml"`
}

const (
	ActionCreate       = "create"
	ActionDelete       = "delete"
	ActionUpdate       = "update"
	TypeExternal       = "external"
	TypeInternal       = "internal"
	TypeNodePort       = "nodePort"
	NodePortRangeBegin = 30000
	NodePortRangeLimit = 32767
)

func checkIsPortValid(nodePort int32) error {
	if nodePort == 0 {
		//do not special port ,no need check
		return nil
	}
	if nodePort < NodePortRangeBegin || nodePort > NodePortRangeLimit {
		return errors.New("Node port is out of range. The range is from 30000 to 32767.")
	}
	return nil
}

func UpdateNetworkInfo(oldIngress *extensions.Ingress, oldService *core.Service, spec *UpdateNetworkSpec, namespace string, templateLabels map[string]string, injectSidecar string) (yamls []UpdateNetworkYaml, err error) {
	switch spec.Action {
	case ActionCreate:
		yamls, err = addNewNetwork(spec, namespace, templateLabels, injectSidecar)
	case ActionDelete:
		yamls, err = deleteNetwork(oldIngress, oldService, spec)
	case ActionUpdate:
		yamls, err = updateNetwork(oldIngress, oldService, spec, namespace, templateLabels, injectSidecar)
	}
	return yamls, err
}

func updateNetwork(oldIngress *extensions.Ingress, oldService *core.Service, spec *UpdateNetworkSpec, namespace string, templateLabels map[string]string, injectSidecar string) ([]UpdateNetworkYaml, error) {
	updateYamls := make([]UpdateNetworkYaml, 0, 2)
	if spec.Type == TypeExternal {
		deleteYamls, err := deleteNetwork(oldIngress, oldService, spec)
		if err != nil {
			return updateYamls, err
		}
		addYamls, err := addNewNetwork(spec, namespace, templateLabels, injectSidecar)
		if err != nil {
			return updateYamls, err
		}
		updateYamls = make([]UpdateNetworkYaml, len(deleteYamls)+len(addYamls))
		copy(updateYamls, deleteYamls)
		copy(updateYamls[len(deleteYamls):], addYamls)
	} else if spec.Type == TypeNodePort && oldService.Spec.Type == core.ServiceTypeNodePort {
		if oldService == nil {
			return updateYamls, errors.New("not find any relate svc nodeport")
		}
		for i, p := range oldService.Spec.Ports {
			if p.Port == spec.OldExternalNodePortInfo.TargetPort {
				//update nodeport type svc port use container target port
				serviceProtocol, portName := setPortNameAndProtocol(spec.NewExternalNodePortInfo.Protocol, oldService.Name)
				oldService.Spec.Ports[i].Name = portName
				oldService.Spec.Ports[i].Port = spec.NewExternalNodePortInfo.TargetPort
				oldService.Spec.Ports[i].Protocol = core.Protocol(serviceProtocol)
				oldService.Spec.Ports[i].TargetPort = intstr.FromInt(int(spec.NewExternalNodePortInfo.TargetPort))
				err := checkIsPortValid(spec.NewExternalNodePortInfo.NodePort)
				if err != nil {
					return updateYamls, err
				}
				oldService.Spec.Ports[i].NodePort = spec.NewExternalNodePortInfo.NodePort
				break
			}
		}
		updateYaml, err := genUpdateNetworkYaml(oldService, ActionUpdate)
		if err != nil {
			return updateYamls, err
		}
		updateYamls = append(updateYamls, *updateYaml)
	} else if spec.Type == TypeInternal && oldService.Spec.Type == core.ServiceTypeClusterIP {
		if oldService == nil {
			return updateYamls, errors.New("not find any relate svc internal")
		}
		for i, p := range oldService.Spec.Ports {
			if p.Port == spec.OldInternalNetworkInfo.SourcePort {
				//update nodeport type svc port use container target port
				serviceProtocol, portName := setPortNameAndProtocol(spec.NewInternalNetworkInfo.Protocol, oldService.Name)
				oldService.Spec.Ports[i].Name = portName
				oldService.Spec.Ports[i].Port = spec.NewInternalNetworkInfo.SourcePort
				oldService.Spec.Ports[i].Protocol = core.Protocol(serviceProtocol)
				oldService.Spec.Ports[i].TargetPort = intstr.FromInt(int(spec.NewInternalNetworkInfo.TargetPort))
				break
			}
		}
		updateYaml, err := genUpdateNetworkYaml(oldService, ActionUpdate)
		if err != nil {
			return updateYamls, err
		}
		updateYamls = append(updateYamls, *updateYaml)
	}
	return updateYamls, nil
}

func addNewNetwork(spec *UpdateNetworkSpec, namespace string, templateLabels map[string]string, injectSidecar string) (updateYamls []UpdateNetworkYaml, err error) {
	updateYamls = make([]UpdateNetworkYaml, 0, 2)
	var yamls []unstructured.Unstructured
	if spec.Type == TypeExternal {
		yamls, err = getExternalNetworkYaml(*spec.NewExternalNetworkInfo, namespace, templateLabels, injectSidecar)
		if err != nil {
			return updateYamls, err
		}
	} else if spec.Type == TypeInternal {
		if spec.NewInternalNetworkInfo == nil {
			return updateYamls, errors.New("spec.NewInternalNetworkInfo is nil ")
		}
		yaml, err := getInternalNetworkYaml(*spec.NewInternalNetworkInfo, namespace, templateLabels, injectSidecar)
		if err != nil {
			return updateYamls, err
		}
		yamls = append(yamls, *yaml)
	} else if spec.Type == TypeNodePort {

		err := checkIsPortValid(spec.NewExternalNodePortInfo.NodePort)
		if err != nil {
			return updateYamls, err
		}
		yaml, err := getNodePortNetworkYaml(*spec.NewExternalNodePortInfo, namespace, templateLabels, injectSidecar)
		if err != nil {
			return updateYamls, err
		}
		yamls = append(yamls, *yaml)
	}
	for _, y := range yamls {
		updateYamls = append(updateYamls, UpdateNetworkYaml{
			Action: ActionCreate,
			Yaml:   y,
		})
	}
	return updateYamls, nil
}

func deleteExternalNetworkYaml(oldIngress *extensions.Ingress, oldService *core.Service, spec *UpdateNetworkSpec) (*[]UpdateNetworkYaml, error) {
	updateYamls := make([]UpdateNetworkYaml, 0, 2)
	if isCreatedBySystem(oldIngress.Annotations) {
		unstr, err := common.ConvertResourceToUnstructured(oldIngress)
		if err != nil {
			return &updateYamls, err
		}
		updateYamls = append(updateYamls, UpdateNetworkYaml{
			Action: ActionDelete,
			Yaml:   *unstr,
		})
		unstr, err = common.ConvertResourceToUnstructured(oldService)
		if err != nil {
			return &updateYamls, err
		}
		updateYamls = append(updateYamls, UpdateNetworkYaml{
			Action: ActionDelete,
			Yaml:   *unstr,
		})
	} else {
		uy, err := removeIngress(oldIngress, *spec.OldExternalNetworkInfo)
		if err != nil {
			return &updateYamls, err
		}
		updateYamls = append(updateYamls, *uy)
	}
	return &updateYamls, nil
}

func deleteNetwork(oldIngress *extensions.Ingress, oldService *core.Service, spec *UpdateNetworkSpec) ([]UpdateNetworkYaml, error) {
	updateYamls := make([]UpdateNetworkYaml, 0, 2)
	if spec.Type == TypeExternal {
		updateYamlsPoint, err := deleteExternalNetworkYaml(oldIngress, oldService, spec)
		return *updateYamlsPoint, err
	} else if spec.Type == TypeInternal && oldService.Spec.Type == core.ServiceTypeClusterIP {
		uy, err := removeService(oldService, spec.OldInternalNetworkInfo.ServiceBaseNetworkInfo)
		if err != nil {
			return updateYamls, err
		}
		updateYamls = append(updateYamls, *uy)
	} else if spec.Type == TypeNodePort && oldService.Spec.Type == core.ServiceTypeNodePort {
		uy, err := removeService(oldService, spec.OldExternalNodePortInfo.ServiceBaseNetworkInfo)
		if err != nil {
			return updateYamls, err
		}
		updateYamls = append(updateYamls, *uy)
	}

	return updateYamls, nil
}

func removeService(os *core.Service, ini ServiceBaseNetworkInfo) (*UpdateNetworkYaml, error) {
	ports := os.Spec.Ports
	for i, p := range ports {
		if p.Port == ini.SourcePort {
			ports := append(ports[:i], ports[i+1:]...)
			if len(ports) == 0 {
				return genUpdateNetworkYaml(os, ActionDelete)
			} else {
				os.Spec.Ports = ports
				return genUpdateNetworkYaml(os, ActionUpdate)
			}
			break
		}
	}
	return nil, errors.New("No matched service port was found.")
}

func removeIngress(oi *extensions.Ingress, eni ExternalNetworkInfo) (yaml *UpdateNetworkYaml, err error) {
	rules := oi.Spec.Rules
	for i, r := range rules {
		if r.Host != eni.Host {
			continue
		}
		paths := r.HTTP.Paths
		for j, p := range paths {
			if p.Path == eni.Path {
				paths = append(paths[:j], paths[j+1:]...)
				break
			}
		}
		r.HTTP.Paths = paths
		if len(r.HTTP.Paths) == 0 {
			rules = append(rules[:i], rules[i+1:]...)
		}
		oi.Spec.Rules = rules
		if len(oi.Spec.Rules) == 0 {
			return genUpdateNetworkYaml(oi, ActionDelete)
		}
		return genUpdateNetworkYaml(oi, ActionUpdate)
	}
	return nil, errors.New("No matched ingress rule was found")
}

func genUpdateNetworkYaml(i interface{}, action string) (*UpdateNetworkYaml, error) {
	unstr, err := common.ConvertResourceToUnstructured(i)
	if err != nil {
		return nil, err
	}
	return &UpdateNetworkYaml{
		Action: action,
		Yaml:   *unstr,
	}, nil
}
