package common

// PodPhase is a label for the condition of a pod at the current time.
import (
	api "k8s.io/api/core/v1"
)

type ControllerStatus string

const (
	ControllerPending   ControllerStatus = "Pending"
	ControllerSucceeded ControllerStatus = "Succeeded"
	ControllerFailed    ControllerStatus = "Failed"
	ControllerUnknown   ControllerStatus = "Unknown"
)

// GetControllerStatus func
func GetControllerStatus(podControllerInfo *PodControllerInfo) (status ControllerStatus) {
	if podControllerInfo == nil || podControllerInfo.Pods == nil {
		return ControllerFailed
	}
	hasPending := false
	for _, pod := range podControllerInfo.Pods {
		if pod.Status == string(api.PodFailed) {
			return ControllerFailed
		} else if pod.Status == string(api.PodPending) || pod.Status == string(api.PodUnknown) {
			hasPending = true
		}
	}
	if hasPending || podControllerInfo.Current != *podControllerInfo.Desired {
		return ControllerPending
	}
	if podControllerInfo.Current == 0 {
		return ControllerUnknown
	}

	return ControllerSucceeded
}

// ControllerContainerInfo struct
type ControllerContainerInfo struct {
	Name      string                   `json:"name"`
	Image     string                   `json:"image"`
	Ports     []api.ContainerPort      `json:"ports"`
	Resources api.ResourceRequirements `json:"resources"`
}

// GetControllerContainerInfo func
func GetControllerContainerInfo(container *api.Container) *ControllerContainerInfo {
	return &ControllerContainerInfo{
		Name:      container.Name,
		Image:     container.Image,
		Ports:     container.Ports,
		Resources: container.Resources,
	}
}
