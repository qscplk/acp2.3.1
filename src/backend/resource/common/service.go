// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package common

import (
	"alauda.io/diablo/src/backend/api"
	"k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// FilterNamespacedServicesBySelector returns services targeted by given resource selector in
// given namespace.
func FilterNamespacedServicesBySelector(services []v1.Service, namespace string,
	resourceSelector map[string]string) []v1.Service {

	var matchingServices []v1.Service
	for _, service := range services {
		if service.ObjectMeta.Namespace == namespace &&
			api.IsSelectorMatching(service.Spec.Selector, resourceSelector) {
			matchingServices = append(matchingServices, service)
		}
	}

	return matchingServices
}

type ServiceInfo struct {
	Name       string
	Namespace  string
	Protocol   string
	PortName   string
	Port       int32
	TargetPort intstr.IntOrString
}

func getContainerPortMap(containers []v1.Container) (containerPortMap map[intstr.IntOrString]bool) {
	containerPortMap = make(map[intstr.IntOrString]bool)
	for _, container := range containers {
		for _, port := range container.Ports {
			if port.Name != "" {
				key := intstr.IntOrString{
					Type:   intstr.String,
					StrVal: port.Name,
				}
				containerPortMap[key] = true
			}
			key := intstr.IntOrString{
				Type:   intstr.Int,
				IntVal: port.ContainerPort,
			}
			containerPortMap[key] = true
		}
	}
	return containerPortMap
}

func FilterServicesInfoBySelectorAndPort(services []v1.Service, namespace string,
	resourceSelector map[string]string) []ServiceInfo {
	matchingServices := FilterNamespacedServicesBySelector(services, namespace, resourceSelector)
	var serviceInfos []ServiceInfo
	for _, service := range matchingServices {
		if service.Spec.Ports == nil {
			continue
		}
		for _, port := range service.Spec.Ports {
			si := ServiceInfo{
				Name:       service.Name,
				Namespace:  namespace,
				Protocol:   string(port.Protocol),
				TargetPort: port.TargetPort,
				Port:       port.Port,
			}
			serviceInfos = append(serviceInfos, si)
		}
	}

	return serviceInfos
}
