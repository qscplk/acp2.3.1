package common

import (
	"regexp"
	"sort"
	"strconv"

	"alauda.io/diablo/src/backend/api"
	core "k8s.io/api/core/v1"
)

// VolumeInfo struct
type VolumeInfo struct {
	Name             string             `json:"name"`
	Type             string             `json:"type"`
	ResourceName     string             `json:"resourceName"`
	HostPath         string             `json:"hostPath"`
	VolumeMountInfos *[]VolumeMountInfo `json:"volumeMountInfos"`
}

// VolumeInfos list of VolumeInfo
type VolumeInfos []*VolumeInfo

func (vis VolumeInfos) Len() int           { return len(vis) }
func (vis VolumeInfos) Swap(i, j int)      { vis[i], vis[j] = vis[j], vis[i] }
func (vis VolumeInfos) Less(i, j int) bool { return vis[i].Name < vis[j].Name }

// VolumeMountInfo struct
type VolumeMountInfo struct {
	MountPath string `json:"mountPath"`
	SubPath   string `json:"subPath"`
}

const HostPath = "HostPath"

func generateVolumeINfoMap(volumes []core.Volume) map[string]*VolumeInfo {
	volumeInfoMap := make(map[string]*VolumeInfo)
	for _, volume := range volumes {
		volumeInfo := &VolumeInfo{}
		if volume.ConfigMap != nil {
			volumeInfo.Type = api.ResourceKindConfigMap
			volumeInfo.ResourceName = volume.ConfigMap.Name
		} else if volume.Secret != nil {
			volumeInfo.Type = api.ResourceKindSecret
			volumeInfo.ResourceName = volume.Secret.SecretName
		} else if volume.HostPath != nil {
			volumeInfo.Type = "HostPath"
			volumeInfo.HostPath = volume.HostPath.Path
		} else if volume.PersistentVolumeClaim != nil {
			volumeInfo.Type = api.ResourceKindPersistentVolumeClaim
			volumeInfo.ResourceName = volume.PersistentVolumeClaim.ClaimName
		}

		if volumeInfo.Type != "" {
			volumeInfoMap[volume.Name] = volumeInfo
		}
	}
	return volumeInfoMap
}

// GetVolumeInfo by container and volume array
func GetVolumeInfo(containers []core.Container, volumes []core.Volume) (volumeInfos []VolumeInfos) {
	volumeInfoMap := generateVolumeINfoMap(volumes)
	volumeInfos = make([]VolumeInfos, 0)
	containerVolumeInfoMap := make(map[string]*VolumeInfo)
	for _, container := range containers {
		var contianerVolumes VolumeInfos
		for _, volumeMount := range container.VolumeMounts {
			if volumeInfoMap[volumeMount.Name] == nil {
				continue
			}
			if volumeMount.SubPath != "" &&
				(volumeInfoMap[volumeMount.Name].Type == api.ResourceKindSecret ||
					volumeInfoMap[volumeMount.Name].Type == api.ResourceKindConfigMap) {
				key := container.Name + volumeMount.Name
				var vi *VolumeInfo
				if containerVolumeInfoMap[key] == nil {
					vi = &VolumeInfo{
						Name:         volumeMount.Name,
						Type:         volumeInfoMap[volumeMount.Name].Type,
						ResourceName: volumeInfoMap[volumeMount.Name].ResourceName,
					}
					containerVolumeInfoMap[key] = vi
				}
				vi = containerVolumeInfoMap[key]
				vi.VolumeMountInfos = appendVolumeMountInfos(vi.VolumeMountInfos, volumeMount)
				containerVolumeInfoMap[key] = vi
			} else {
				vi := &VolumeInfo{
					Name:             volumeMount.Name,
					ResourceName:     volumeInfoMap[volumeMount.Name].ResourceName,
					Type:             volumeInfoMap[volumeMount.Name].Type,
					HostPath:         volumeInfoMap[volumeMount.Name].HostPath,
					VolumeMountInfos: appendVolumeMountInfos(nil, volumeMount),
				}
				contianerVolumes = append(contianerVolumes, vi)
			}
		}
		for _, vi := range containerVolumeInfoMap {
			contianerVolumes = append(contianerVolumes, vi)
		}
		sort.Stable(contianerVolumes)
		volumeInfos = append(volumeInfos, contianerVolumes)
	}
	return
}

func appendVolumeMountInfos(vmis *[]VolumeMountInfo, vm core.VolumeMount) *[]VolumeMountInfo {
	if vmis == nil {
		newVMIS := make([]VolumeMountInfo, 0)
		vmis = &newVMIS
	}
	vmi := VolumeMountInfo{
		MountPath: vm.MountPath,
		SubPath:   vm.SubPath,
	}
	*vmis = append(*vmis, vmi)
	return vmis
}

func getVolumeIndex(volume core.Volume, volumeIndex int) int {
	reg := regexp.MustCompile(`^volume-([0-9]+)$`)
	if reg.Match([]byte(volume.Name)) {
		newNumber, _ := strconv.Atoi(reg.ReplaceAllString(volume.Name, "$1"))
		if newNumber >= volumeIndex {
			return newNumber + 1
		}
	}
	return volumeIndex
}

// GetVolume when the volume is exist just return exist, otherwise create a new one
func GetVolume(volumes []core.Volume, vi VolumeInfo) (volume core.Volume, isExist bool) {
	volumeIndex := 0
	isExist = true
	for _, volume = range volumes {
		volumeIndex = getVolumeIndex(volume, volumeIndex)
		// when the volume is exist, just return it
		if volume.Name == vi.Name {
			return
		} else if vi.Type == HostPath && volume.HostPath != nil && vi.HostPath == volume.HostPath.Path {
			return
		} else if vi.Type == api.ResourceKindConfigMap && volume.ConfigMap != nil && volume.ConfigMap.Name == vi.ResourceName {
			return
		} else if vi.Type == api.ResourceKindSecret && volume.Secret != nil && volume.Secret.SecretName == vi.ResourceName {
			return
		} else if vi.Type == api.ResourceKindPersistentVolumeClaim && volume.PersistentVolumeClaim != nil && volume.PersistentVolumeClaim.ClaimName == vi.ResourceName {
			return
		}
	}
	// try to create the new
	isExist = false
	volume = core.Volume{
		Name: "volume-" + strconv.Itoa(volumeIndex),
	}
	if vi.Type == HostPath {
		volume.HostPath = &core.HostPathVolumeSource{
			Path: vi.HostPath,
		}
	} else if vi.Type == api.ResourceKindConfigMap {
		volume.ConfigMap = &core.ConfigMapVolumeSource{
			LocalObjectReference: core.LocalObjectReference{
				Name: vi.ResourceName,
			},
		}
	} else if vi.Type == api.ResourceKindSecret {
		volume.Secret = &core.SecretVolumeSource{
			SecretName: vi.ResourceName,
		}
	} else if vi.Type == api.ResourceKindPersistentVolumeClaim {
		volume.PersistentVolumeClaim = &core.PersistentVolumeClaimVolumeSource{
			ClaimName: vi.ResourceName,
		}
	}
	return
}

// CreateContainerVolumeMount func
func CreateContainerVolumeMount(
	container core.Container, volumes []core.Volume, vi VolumeInfo) (
	[]core.VolumeMount, []core.Volume) {
	volume, isExist := GetVolume(volumes, vi)
	if !isExist {
		volumes = append(volumes, volume)
	}

	for _, vmi := range *vi.VolumeMountInfos {
		vm := core.VolumeMount{
			Name:      volume.Name,
			MountPath: vmi.MountPath,
			SubPath:   vmi.SubPath,
		}
		container.VolumeMounts = append(container.VolumeMounts, vm)
	}
	return container.VolumeMounts, volumes
}
