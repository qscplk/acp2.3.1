package servicegraph

import (
	v1 "k8s.io/api/core/v1"
)

type ServiceOverview struct {
	// Name of the Service
	// required: true
	// example: reviews-v1
	Name string `json:"name"`
	// Define if Pods related to this Service has an IstioSidecar deployed
	// required: true
	// example: true
	IstioSidecar bool `json:"istioSidecar"`
	// Has label app
	// required: true
	// example: true
	AppLabel bool `json:"appLabel"`
}

type ServiceList struct {
	Namespace string            `json:"namespace"`
	Services  []ServiceOverview `json:"services"`
}

type Ports []Port

type Port struct {
	Name     string `json:"name"`
	Protocol string `json:"protocol"`
	Port     int32  `json:"port"`
}

func (ports *Ports) Parse(ps []v1.ServicePort) {
	for _, servicePort := range ps {
		port := Port{}
		port.Parse(servicePort)
		*ports = append(*ports, port)
	}
}

func (port *Port) Parse(p v1.ServicePort) {
	port.Name = p.Name
	port.Protocol = string(p.Protocol)
	port.Port = p.Port
}

type Services []*Service
type Service struct {
	Name            string            `json:"name"`
	CreatedAt       string            `json:"createdAt"`
	ResourceVersion string            `json:"resourceVersion"`
	Namespace       string            `json:"namespace"`
	Labels          map[string]string `json:"labels"`
	Type            string            `json:"type"`
	Ip              string            `json:"ip"`
	Ports           Ports             `json:"ports"`
}

// SourceWorkload holds workload identifiers used for service dependencies
type SourceWorkload struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

func (ss *Services) Parse(services []v1.Service) {
	if ss == nil {
		return
	}

	for _, item := range services {
		service := &Service{}
		service.Parse(&item)
		*ss = append(*ss, service)
	}
}

func (s *Service) Parse(service *v1.Service) {
	if service != nil {
		s.Name = service.Name
		s.Namespace = service.Namespace
		s.Labels = service.Labels
		s.Type = string(service.Spec.Type)
		s.Ip = service.Spec.ClusterIP
		s.CreatedAt = formatTime(service.CreationTimestamp.Time)
		s.ResourceVersion = service.ResourceVersion
		(&s.Ports).Parse(service.Spec.Ports)
	}
}
