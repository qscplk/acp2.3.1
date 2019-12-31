package container

import (
	"alauda.io/diablo/src/backend/resource/common"
	core "k8s.io/api/core/v1"
)

// UpdateContainerRequest struct
type UpdateContainerRequest struct {
	Container  core.Container     `json:"container"`
	VolumeInfo common.VolumeInfos `json:"volumeInfo"`
}

// UpdateContainerImageRequest struct
type UpdateContainerImageRequest struct {
	Image string `json:"image"`
}

// UpdateContainerEnvRequest struct
type UpdateContainerEnvRequest struct {
	Env     []core.EnvVar        `json:"env"`
	EnvFrom []core.EnvFromSource `json:"envFrom"`
}

type UpdateContainerResourceRequest struct {
	Limits   *core.ResourceList `json:"limits,omitempty"`
	Requests *core.ResourceList `json:"requests,omitempty"`
}
