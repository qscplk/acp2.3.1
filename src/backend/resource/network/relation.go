package network

import (
	"fmt"

	"alauda.io/diablo/src/backend/resource/common"
	core "k8s.io/api/core/v1"
	extensions "k8s.io/api/extensions/v1beta1"
	meta "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

const (
	SYSTEM = "SYSTEM"
)

// the file used to generator the network relation between ingress service, deployment
type NetworkRelation struct {
	IngressData    *IngressData    `json:"ingressData"`
	ServiceData    *ServiceData    `json:"ServiceData"`
	ControllerData *ControllerData `json:"controllerData"`
}

type IngressData struct {
	Name              string                     `json:"serviceName"`
	IsCreatedBySystem bool                       `json:"isCreateBySystem"`
	Host              string                     `json:"host"`
	Path              extensions.HTTPIngressPath `json:"path"`
	DomainName        string                     `json:"domainName"`
	DomainPrefix      string                     `json:"domainPrefix"`
	IsHttps           bool                       `json:"isHttps"`
	CreatedAt         meta.Time                  `json:"createdAt"`
}

type ServiceData struct {
	Name              string           `json:"serviceName"`
	IsCreatedBySystem bool             `json:"isCreateBySystem"`
	Port              core.ServicePort `json:"port"`
	CreatedAt         meta.Time        `json:"createdAt"`
	Type              core.ServiceType `json:"type"`
}

type ControllerData struct {
	ContainerPort int32 `json:"containerPort"`
}

func (nr *NetworkRelation) isExternal() bool {
	return nr.IngressData != nil
}

func getContainerPort(cpMap map[string]int32, targePort intstr.IntOrString) int32 {
	var cp int32
	if targePort.IntVal != 0 {
		cp = targePort.IntVal
	} else {
		if _, ok := cpMap[getStringKey(targePort.StrVal)]; ok {
			cp = cpMap[getStringKey(targePort.StrVal)]
		}
	}
	return cp
}

func getMatchServiceData(serviceName string, sp intstr.IntOrString, sdMap map[string]*ServiceData) (sd *ServiceData) {
	var mapKey string
	if sp.StrVal != "" {
		mapKey = serviceName + getStringKey(sp.StrVal)
		if _, ok := sdMap[mapKey]; ok {
			sd = sdMap[mapKey]
		}
	} else {
		mapKey = serviceName + getIntKey(sp.IntVal)
		if _, ok := sdMap[mapKey]; ok {
			sd = sdMap[mapKey]
		}
	}
	return sd
}

func getDomainNameAndPrefix(anno map[string]string) (domainName, domainPrefix string) {
	if _, ok := anno[getDomainKey()]; ok {
		domainName = anno[getDomainKey()]
	}
	if _, ok := anno[getPrefixKey()]; ok {
		domainPrefix = anno[getPrefixKey()]
	}
	return
}

func getNetworkRelationFromIngress(i *extensions.Ingress, sdMap map[string]*ServiceData, cpMap map[string]int32) *[]NetworkRelation {
	nrs := make([]NetworkRelation, 0, 2)
	for _, r := range i.Spec.Rules {
		for _, p := range r.HTTP.Paths {
			sd := getMatchServiceData(p.Backend.ServiceName, p.Backend.ServicePort, sdMap)
			if sd == nil {
				continue
			}
			anno := i.GetAnnotations()
			domainName, domainPrefix := getDomainNameAndPrefix(anno)
			ingressData := &IngressData{
				Name:              i.GetName(),
				IsCreatedBySystem: isCreatedBySystem(i.Annotations),
				Host:              r.Host,
				Path:              p,
				DomainName:        domainName,
				DomainPrefix:      domainPrefix,
				IsHttps:           len(i.Spec.TLS) > 0,
				CreatedAt:         i.GetCreationTimestamp(),
			}

			cp := getContainerPort(cpMap, sd.Port.TargetPort)
			// cp can't be 0
			if cp == 0 {
				continue
			}

			nrs = append(nrs, NetworkRelation{
				IngressData: ingressData,
				ServiceData: sd,
				ControllerData: &ControllerData{
					ContainerPort: cp,
				},
			})
		}
	}
	return &nrs
}

func generateDeploymentNetworRelations(containers *[]core.Container, is *[]extensions.Ingress,
	ss *[]core.Service, namespace string, resourceSelector map[string]string) []NetworkRelation {
	nrs := make([]NetworkRelation, 0, 2)
	cpMap := getTemplatePortMap(*containers)
	matchingServices := common.FilterNamespacedServicesBySelector(*ss, namespace, resourceSelector)
	sdMap := getServicePortMap(matchingServices)

	for _, i := range *is {
		subNRS := getNetworkRelationFromIngress(&i, sdMap, cpMap)
		for _, sub := range *subNRS {
			nrs = append(nrs, sub)
		}
	}

	addedService := make(map[string]bool)
	for _, sd := range sdMap {
		if sd.IsCreatedBySystem {
			continue
		}
		cp := getContainerPort(cpMap, sd.Port.TargetPort)
		// cp can't be 0
		if cp == 0 {
			continue
		}
		// record whether the port is used to generate the relation
		key := fmt.Sprintf("%s-%d", sd.Name, cp)
		if addedService[key] {
			continue
		}
		addedService[key] = true
		nrs = append(nrs, NetworkRelation{
			ServiceData: sd,
			ControllerData: &ControllerData{
				ContainerPort: cp,
			},
		})
	}
	return nrs
}

func getServicePortMap(ss []core.Service) map[string]*ServiceData {
	spMap := make(map[string]*ServiceData)
	for _, s := range ss {
		if s.Spec.Type != core.ServiceTypeClusterIP && s.Spec.Type != core.ServiceTypeNodePort {
			continue
		}
		for _, p := range s.Spec.Ports {
			sd := &ServiceData{
				Name:              s.GetName(),
				Port:              p,
				IsCreatedBySystem: isCreatedBySystem(s.Annotations),
				CreatedAt:         s.GetCreationTimestamp(),
				Type:              s.Spec.Type,
			}
			if p.Name != "" {
				spMap[s.GetName()+getStringKey(p.Name)] = sd
			}
			spMap[s.GetName()+getIntKey(p.Port)] = sd
		}
	}
	return spMap
}

func getTemplatePortMap(cs []core.Container) map[string]int32 {
	cpMap := make(map[string]int32)
	for _, c := range cs {
		for _, p := range c.Ports {
			if p.Name != "" {
				cpMap[getStringKey(p.Name)] = p.ContainerPort
			}
			cpMap[getIntKey(p.ContainerPort)] = p.ContainerPort
		}
	}
	return cpMap
}

func getStringKey(s string) string {
	return fmt.Sprintf("s-%s", s)
}

func getIntKey(i int32) string {
	return fmt.Sprintf("n-%d", i)
}

func isCreatedBySystem(annotation map[string]string) bool {
	key := getCreatorKey()
	_, ok := annotation[key]
	if ok && annotation[key] == SYSTEM {
		return true
	}
	return false
}

func getCreatorKey() string {
	return fmt.Sprintf("app.%s/creator", common.GetLocalBaseDomain())
}
