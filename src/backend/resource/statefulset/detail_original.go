package statefulset

import (
	"encoding/json"
	"errors"
	"log"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/container"
	v1 "k8s.io/api/apps/v1"
	core "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	client "k8s.io/client-go/kubernetes"
)

func GetStatefulSetDetailOriginal(client client.Interface, namespace string,
	statefulSetName string) (*v1.StatefulSet, error) {

	log.Printf("Getting details of %s statefulSetName in %s namespace", statefulSetName, namespace)
	statefulSet, err := client.Apps().StatefulSets(namespace).Get(statefulSetName, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	setTypeMeta(statefulSet)
	return statefulSet, nil
}

func UpdateStatefulSetOriginal(client client.Interface, namespace string,
	statefulSetName string, statefulSet *v1.StatefulSet) (*v1.StatefulSet, error) {
	old, err := GetStatefulSetDetailOriginal(client, namespace, statefulSetName)
	if err != nil {
		return nil, err
	}
	statefulSet.ObjectMeta.ResourceVersion = old.ObjectMeta.ResourceVersion
	statefulSet.ObjectMeta.Generation = old.ObjectMeta.Generation
	statefulSet.ObjectMeta.UID = old.ObjectMeta.UID
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	setTypeMeta(statefulSet)
	return statefulSet, err
}

type StatefulSetReplica struct {
	Replicas int32 `json:"replicas"`
}

func UpdateStatefulSetReplica(client client.Interface, namespace string,
	statefulSetName string, replicas StatefulSetReplica) (statefulSet *v1.StatefulSet, err error) {
	statefulSet, err = GetStatefulSetDetailOriginal(client, namespace, statefulSetName)
	if err != nil {
		return
	}

	statefulSet.Spec.Replicas = &replicas.Replicas
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	setTypeMeta(statefulSet)
	return
}

// PutStatefulsetContainer func
func PutStatefulsetContainer(client client.Interface, namespace string,
	statefulSetName string, containerName string, isDryRun bool, udsc container.UpdateContainerRequest) (statefulSet *v1.StatefulSet, err error) {
	statefulSet, err = GetStatefulSetDetailOriginal(client, namespace, statefulSetName)
	if err != nil {
		return
	}
	usedValumeMap := make(map[string]bool)
	for index, container := range statefulSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			statefulSet.Spec.Template.Spec.Containers[index] = udsc.Container
			statefulSet.Spec.Template.Spec.Containers[index].VolumeMounts = make([]core.VolumeMount, 0)
			for _, vi := range udsc.VolumeInfo {
				statefulSet.Spec.Template.Spec.Containers[index].VolumeMounts, statefulSet.Spec.Template.Spec.Volumes = common.CreateContainerVolumeMount(
					statefulSet.Spec.Template.Spec.Containers[index], statefulSet.Spec.Template.Spec.Volumes, *vi)
			}
			break
		}
	}

	for index := range statefulSet.Spec.Template.Spec.Containers {
		for _, vm := range statefulSet.Spec.Template.Spec.Containers[index].VolumeMounts {
			usedValumeMap[vm.Name] = true
		}
	}

	// remove useless volume
	newVolumes := make([]core.Volume, 0)
	for _, v := range statefulSet.Spec.Template.Spec.Volumes {
		if usedValumeMap[v.Name] {
			newVolumes = append(newVolumes, v)
		}
	}
	statefulSet.Spec.Template.Spec.Volumes = newVolumes
	if isDryRun {
		return
	}
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	return
}

// UpdateContainerEnv func
func UpdateContainerEnv(client client.Interface, namespace string,
	controllerName string, containerName string, ucer container.UpdateContainerEnvRequest) (statefulSet *v1.StatefulSet, err error) {
	statefulSet, err = GetStatefulSetDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	for index, container := range statefulSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			statefulSet.Spec.Template.Spec.Containers[index].Env = ucer.Env
			statefulSet.Spec.Template.Spec.Containers[index].EnvFrom = ucer.EnvFrom
			break
		}
	}
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	return
}

func UpdateContainerResource(client client.Interface, namespace string,
	controllerName string, containerName string, ucer container.UpdateContainerResourceRequest) (statefulSet *v1.StatefulSet, err error) {
	statefulSet, err = GetStatefulSetDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	if ucer.Limits == nil && ucer.Requests == nil {
		return
	}
	for index, container := range statefulSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			if ucer.Limits != nil {
				statefulSet.Spec.Template.Spec.Containers[index].Resources.Limits = *ucer.Limits
			}
			if ucer.Requests != nil {
				statefulSet.Spec.Template.Spec.Containers[index].Resources.Requests = *ucer.Requests
			}
			break
		}
	}
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	return
}

// UpdateContainerImage func
func UpdateContainerImage(client client.Interface, namespace string,
	controllerName string, containerName string, ucir container.UpdateContainerImageRequest) (statefulSet *v1.StatefulSet, err error) {
	statefulSet, err = GetStatefulSetDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	for index, container := range statefulSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			statefulSet.Spec.Template.Spec.Containers[index].Image = ucir.Image
			break
		}
	}
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	return
}

// CreateStatefulSetVolumeMount func
func CreateStatefulSetVolumeMount(client client.Interface, namespace string,
	statefulSetName string, containerName string, vi common.VolumeInfo) (statefulSet *v1.StatefulSet, err error) {
	statefulSet, err = GetStatefulSetDetailOriginal(client, namespace, statefulSetName)
	if err != nil {
		return
	}
	for index, container := range statefulSet.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			statefulSet.Spec.Template.Spec.Containers[index].VolumeMounts, statefulSet.Spec.Template.Spec.Volumes = common.CreateContainerVolumeMount(
				container, statefulSet.Spec.Template.Spec.Volumes, vi)
			break
		}
	}
	statefulSet, err = client.AppsV1().StatefulSets(namespace).Update(statefulSet)
	return
}

func GetFormCore(app appCore.Application) ([]v1.StatefulSet, error) {
	list := make([]v1.StatefulSet, 0)
	for _, r := range app.Resources {
		if r.GetKind() == api.ResourceKindStatefulSet {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*v1.StatefulSet, error) {
	if unstr == nil {
		return nil, errors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &v1.StatefulSet{}
	err = json.Unmarshal(data, output)
	return output, err
}
