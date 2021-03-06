package servicegraph

import (
	"encoding/json"

	v1 "k8s.io/api/core/v1"
)

// Pods alias for list of Pod structs
type Pods []*Pod

// Pod holds a subset of v1.Pod data that is meaningful in Kiali
type Pod struct {
	Name                string            `json:"name"`
	Labels              map[string]string `json:"labels"`
	CreatedAt           string            `json:"createdAt"`
	CreatedBy           []Reference       `json:"createdBy"`
	IstioContainers     []*ContainerInfo  `json:"istioContainers"`
	IstioInitContainers []*ContainerInfo  `json:"istioInitContainers"`
	Status              string            `json:"status"`
	AppLabel            bool              `json:"appLabel"`
	VersionLabel        bool              `json:"versionLabel"`
	App                 string            `json:"app"`
	Version             string            `json:"version"`
	RuntimesAnnotation  []string          `json:"runtimesAnnotation"`
}

// Reference holds some information on the pod creator
type Reference struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
}

// ContainerInfo holds container name and image
type ContainerInfo struct {
	Name  string `json:"name"`
	Image string `json:"image"`
}

// ParseDeployment extracts desired information from k8s []Pod info
func (pods *Pods) Parse(list []v1.Pod) {
	if list == nil {
		return
	}

	for _, pod := range list {
		casted := Pod{}
		casted.Parse(&pod)
		*pods = append(*pods, &casted)
	}
}

// Below types are used for unmarshalling json
type createdBy struct {
	Reference Reference `json:"reference"`
}
type sideCarStatus struct {
	Containers     []string `json:"containers"`
	InitContainers []string `json:"initContainers"`
}

// ParseDeployment extracts desired information from k8s Pod info
func (pod *Pod) Parse(p *v1.Pod) {
	pod.Name = p.Name
	pod.Labels = p.Labels
	pod.CreatedAt = formatTime(p.CreationTimestamp.Time)
	for _, ref := range p.OwnerReferences {
		pod.CreatedBy = append(pod.CreatedBy, Reference{
			Name: ref.Name,
			Kind: ref.Kind,
		})
	}
	// ParseDeployment some annotations
	if jSon, ok := p.Annotations[IstioSidecarAnnotationName]; ok {
		var scs sideCarStatus
		err := json.Unmarshal([]byte(jSon), &scs)
		if err == nil {
			for _, name := range scs.InitContainers {
				container := ContainerInfo{
					Name:  name,
					Image: lookupImage(name, p.Spec.InitContainers)}
				pod.IstioInitContainers = append(pod.IstioInitContainers, &container)
			}
			for _, name := range scs.Containers {
				container := ContainerInfo{
					Name:  name,
					Image: lookupImage(name, p.Spec.Containers)}
				pod.IstioContainers = append(pod.IstioContainers, &container)
			}
		}
	}

	pod.Status = string(p.Status.Phase)
	pod.App, pod.AppLabel = p.Labels[IstioLabelAPPName]
	pod.Version, pod.VersionLabel = p.Labels[IstioLabelVersionName]
}

func lookupImage(containerName string, containers []v1.Container) string {
	for _, c := range containers {
		if c.Name == containerName {
			return c.Image
		}
	}
	return ""
}

func (pods Pods) HasIstioSideCar() bool {
	for _, pod := range pods {
		if pod.HasIstioSideCar() {
			return true
		}
	}
	return false
}

func (pod Pod) HasIstioSideCar() bool {
	return len(pod.IstioContainers) > 0
}
