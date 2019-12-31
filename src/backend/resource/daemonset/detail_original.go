package daemonset

import (
	"encoding/json"
	"errors"
	"log"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/container"
	"k8s.io/api/apps/v1"
	core "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	client "k8s.io/client-go/kubernetes"
)

func GetDaemonSetDetailOriginal(client client.Interface, namespace string,
	daemonSetName string) (*v1.DaemonSet, error) {

	log.Printf("Getting details of %s daemonset in %s namespace", daemonSetName, namespace)
	daemonSet, err := client.Apps().DaemonSets(namespace).Get(daemonSetName, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	setTypeMeta(daemonSet)
	return daemonSet, nil
}

func UpdateDeamonSetOriginal(client client.Interface, namespace string,
	daemonSetName string, daemonSet *v1.DaemonSet) (*v1.DaemonSet, error) {
	old, err := GetDaemonSetDetailOriginal(client, namespace, daemonSetName)
	if err != nil {
		return nil, err
	}
	daemonSet.ObjectMeta.ResourceVersion = old.ObjectMeta.ResourceVersion
	daemonSet.ObjectMeta.Generation = old.ObjectMeta.Generation
	daemonSet.ObjectMeta.UID = old.ObjectMeta.UID
	daemonSet, err = client.AppsV1().DaemonSets(namespace).Update(daemonSet)
	setTypeMeta(daemonSet)
	return daemonSet, err
}

// CreateDaemonSetVolumeMount func
func CreateDaemonSetVolumeMount(client client.Interface, namespace string,
	daemonSetName string, containerName string, vi common.VolumeInfo) (daemonSet *v1.DaemonSet, err error) {
	daemonSet, err = GetDaemonSetDetailOriginal(client, namespace, daemonSetName)
	if err != nil {
		return
	}
	for index, container := range daemonSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			daemonSet.Spec.Template.Spec.Containers[index].VolumeMounts, daemonSet.Spec.Template.Spec.Volumes = common.CreateContainerVolumeMount(
				container, daemonSet.Spec.Template.Spec.Volumes, vi)
			break
		}
	}
	daemonSet, err = client.AppsV1().DaemonSets(namespace).Update(daemonSet)
	return
}

// UpdateContainerEnv func
func UpdateContainerEnv(client client.Interface, namespace string,
	controllerName string, containerName string, ucer container.UpdateContainerEnvRequest) (daemonSet *v1.DaemonSet, err error) {
	daemonSet, err = GetDaemonSetDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	for index, container := range daemonSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			daemonSet.Spec.Template.Spec.Containers[index].Env = ucer.Env
			daemonSet.Spec.Template.Spec.Containers[index].EnvFrom = ucer.EnvFrom
			break
		}
	}
	daemonSet, err = client.AppsV1().DaemonSets(namespace).Update(daemonSet)
	return
}

func UpdateContainerResource(client client.Interface, namespace string,
	controllerName string, containerName string, ucer container.UpdateContainerResourceRequest) (daemonSet *v1.DaemonSet, err error) {

	daemonSet, err = GetDaemonSetDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	if ucer.Limits == nil && ucer.Requests == nil {
		return
	}
	for index, container := range daemonSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			if ucer.Limits != nil {
				daemonSet.Spec.Template.Spec.Containers[index].Resources.Limits = *ucer.Limits
			}
			if ucer.Requests != nil {
				daemonSet.Spec.Template.Spec.Containers[index].Resources.Requests = *ucer.Requests
			}
			break
		}
	}
	daemonSet, err = client.AppsV1().DaemonSets(namespace).Update(daemonSet)
	return
}

// UpdateContainerImage func
func UpdateContainerImage(client client.Interface, namespace string,
	controllerName string, containerName string, ucir container.UpdateContainerImageRequest) (daemonSet *v1.DaemonSet, err error) {
	daemonSet, err = GetDaemonSetDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	for index, container := range daemonSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			daemonSet.Spec.Template.Spec.Containers[index].Image = ucir.Image
			break
		}
	}
	daemonSet, err = client.AppsV1().DaemonSets(namespace).Update(daemonSet)
	return
}

// PutDaemonsetContainer func
func PutDaemonsetContainer(client client.Interface, namespace string,
	daemonSetName string, containerName string, isDryRun bool, udsc container.UpdateContainerRequest) (daemonSet *v1.DaemonSet, err error) {
	daemonSet, err = GetDaemonSetDetailOriginal(client, namespace, daemonSetName)
	if err != nil {
		return
	}
	usedValumeMap := make(map[string]bool)
	for index, container := range daemonSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {

			daemonSet.Spec.Template.Spec.Containers[index] = udsc.Container

			daemonSet.Spec.Template.Spec.Containers[index].VolumeMounts = make([]core.VolumeMount, 0)
			for _, vi := range udsc.VolumeInfo {
				daemonSet.Spec.Template.Spec.Containers[index].VolumeMounts, daemonSet.Spec.Template.Spec.Volumes = common.CreateContainerVolumeMount(
					daemonSet.Spec.Template.Spec.Containers[index], daemonSet.Spec.Template.Spec.Volumes, *vi)
			}
			break
		}
	}

	for index := range daemonSet.Spec.Template.Spec.Containers {
		for _, vm := range daemonSet.Spec.Template.Spec.Containers[index].VolumeMounts {
			usedValumeMap[vm.Name] = true
		}
	}

	// remove useless volume
	newVolumes := make([]core.Volume, 0)
	for _, v := range daemonSet.Spec.Template.Spec.Volumes {
		if usedValumeMap[v.Name] {
			newVolumes = append(newVolumes, v)
		}
	}
	daemonSet.Spec.Template.Spec.Volumes = newVolumes
	if isDryRun {
		return
	}
	daemonSet, err = client.AppsV1().DaemonSets(namespace).Update(daemonSet)
	return
}

func GetFormCore(app appCore.Application) ([]v1.DaemonSet, error) {
	list := make([]v1.DaemonSet, 0)
	for _, r := range app.Resources {
		if r.GetKind() == api.ResourceKindDaemonSet {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*v1.DaemonSet, error) {
	if unstr == nil {
		return nil, errors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &v1.DaemonSet{}
	err = json.Unmarshal(data, output)
	return output, err
}
