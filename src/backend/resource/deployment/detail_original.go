package deployment

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/container"
	v1 "k8s.io/api/apps/v1"
	core "k8s.io/api/core/v1"
	extensionsv1beta1 "k8s.io/api/extensions/v1beta1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	client "k8s.io/client-go/kubernetes"
)

func setTypeMeta(deploy *v1.Deployment) {
	if deploy == nil {
		return
	}
	deploy.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "apps",
		Version: "v1",
		Kind:    "Deployment",
	})
}

func GetDeploymentDetailOriginal(client client.Interface, namespace string,
	deploymentName string) (*v1.Deployment, error) {

	log.Printf("Getting details of %s deployment in %s namespace", deploymentName, namespace)
	deploy, err := client.AppsV1().Deployments(namespace).Get(deploymentName, api.GetOptionsInCache)

	if err != nil {
		return nil, err
	}
	setTypeMeta(deploy)
	return deploy, nil
}

func UpdateDeploymentOriginal(client client.Interface, namespace string,
	deploymentName string, deploy *v1.Deployment) (*v1.Deployment, error) {
	old, err := GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return nil, err
	}
	deploy.ObjectMeta.ResourceVersion = old.ObjectMeta.ResourceVersion
	deploy.ObjectMeta.Generation = old.ObjectMeta.Generation
	deploy.ObjectMeta.UID = old.ObjectMeta.UID
	deploy, err = client.AppsV1().Deployments(namespace).Update(deploy)
	setTypeMeta(deploy)
	return deploy, err
}

type DeploymentReplica struct {
	Replicas int32 `json:"replicas"`
}

func UpdateDeploymentReplica(client client.Interface, namespace string,
	deploymentName string, replicas DeploymentReplica) (deploy *v1.Deployment, err error) {
	deploy, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}

	deploy.Spec.Replicas = &replicas.Replicas
	deploy, err = client.AppsV1().Deployments(namespace).Update(deploy)
	setTypeMeta(deploy)
	return
}

func DeleteObject(client client.Interface, obj runtime.Object) (name string, err error) {
	if deploy, ok := obj.(*v1.Deployment); ok {
		name = deploy.GetName()
		err = client.AppsV1().Deployments(deploy.GetNamespace()).Delete(deploy.GetName(), nil)
	} else {
		err = fmt.Errorf("Deployment runtime is not a valid object type: %v", obj)
	}
	return
}

// UpdateContainerEnv func
func UpdateContainerEnv(client client.Interface, namespace string,
	controllerName string, containerName string, ucer container.UpdateContainerEnvRequest) (deployment *v1.Deployment, err error) {
	deployment, err = GetDeploymentDetailOriginal(client, namespace, controllerName)
	if err != nil {
		return
	}
	for index, container := range deployment.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			deployment.Spec.Template.Spec.Containers[index].Env = ucer.Env
			deployment.Spec.Template.Spec.Containers[index].EnvFrom = ucer.EnvFrom
			break
		}
	}
	deployment, err = client.AppsV1().Deployments(namespace).Update(deployment)
	return
}

// UpdateContainerImage func
func UpdateContainerImage(client client.Interface, namespace string,
	deploymentName string, containerName string, ucir container.UpdateContainerImageRequest) (deployment *v1.Deployment, err error) {
	deployment, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}
	for index, container := range deployment.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			deployment.Spec.Template.Spec.Containers[index].Image = ucir.Image
			break
		}
	}
	deployment, err = client.AppsV1().Deployments(namespace).Update(deployment)
	return
}

func UpdateContainerResource(client client.Interface, namespace string,
	deploymentName string, containerName string, ucir container.UpdateContainerResourceRequest) (deployment *v1.Deployment, err error) {
	deployment, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}
	if ucir.Limits == nil && ucir.Requests == nil {
		return
	}
	for index, container := range deployment.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			if ucir.Limits != nil {
				deployment.Spec.Template.Spec.Containers[index].Resources.Limits = *ucir.Limits
			}
			if ucir.Requests != nil {
				deployment.Spec.Template.Spec.Containers[index].Resources.Requests = *ucir.Requests
			}
			break
		}
	}
	deployment, err = client.AppsV1().Deployments(namespace).Update(deployment)
	return
}

func RollBackToSpecialRevision(client client.Interface, namespace string, deploymentName string, ucrv common.RevisionDetail) (deployment *v1.Deployment, err error) {
	deployment, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}

	//not deal paused
	if deployment.Spec.Paused {
		err = errors.New("you cannot rollback a paused deployment")
		return
	}

	replicaSetList, err := GetDeploymentOldReplicaSets(client, nil, namespace, deploymentName)
	if err != nil {
		return
	}
	//if Revision is set to -1, get the last revision
	if ucrv.Revision == -1 {
		for index, _ := range replicaSetList.ReplicaSets {
			var intRevision int64
			intRevision, err = strconv.ParseInt(replicaSetList.ReplicaSets[index].Revision, 10, 0)
			if err != nil {
				return
			}
			if intRevision >= ucrv.Revision {
				ucrv.Revision = intRevision
			}
		}
	} else {
		isExist := false
		//check if the revision exist
		for index, _ := range replicaSetList.ReplicaSets {
			var intRevision int64
			intRevision, err = strconv.ParseInt(replicaSetList.ReplicaSets[index].Revision, 10, 0)
			if err != nil {
				return
			}
			if intRevision == ucrv.Revision {
				isExist = true
				break
			}
		}
		if !isExist {
			err = errors.New("input revision is not valid")
			return
		}
	}

	deploymentRollback := &extensionsv1beta1.DeploymentRollback{
		Name: deploymentName,
		RollbackTo: extensionsv1beta1.RollbackConfig{
			Revision: ucrv.Revision,
		},
	}

	err = client.ExtensionsV1beta1().Deployments(namespace).Rollback(deploymentRollback)
	if err != nil {
		return
	}

	//get again
	deployment, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}
	return
}

// PutDeploymentContainer func
func PutDeploymentContainer(client client.Interface, namespace string,
	deploymentName string, containerName string, isDryRun bool, udsc container.UpdateContainerRequest) (deployment *v1.Deployment, err error) {
	deployment, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}
	usedValumeMap := make(map[string]bool)
	for index, container := range deployment.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			deployment.Spec.Template.Spec.Containers[index] = udsc.Container
			deployment.Spec.Template.Spec.Containers[index].VolumeMounts = make([]core.VolumeMount, 0)
			for _, vi := range udsc.VolumeInfo {
				deployment.Spec.Template.Spec.Containers[index].VolumeMounts, deployment.Spec.Template.Spec.Volumes = common.CreateContainerVolumeMount(
					deployment.Spec.Template.Spec.Containers[index], deployment.Spec.Template.Spec.Volumes, *vi)
			}
			break
		}
	}

	for index := range deployment.Spec.Template.Spec.Containers {
		for _, vm := range deployment.Spec.Template.Spec.Containers[index].VolumeMounts {
			usedValumeMap[vm.Name] = true
		}
	}

	// remove useless volume
	newVolumes := make([]core.Volume, 0)
	for _, v := range deployment.Spec.Template.Spec.Volumes {
		if usedValumeMap[v.Name] {
			newVolumes = append(newVolumes, v)
		}
	}
	deployment.Spec.Template.Spec.Volumes = newVolumes
	if isDryRun {
		return
	}
	deployment, err = client.AppsV1().Deployments(namespace).Update(deployment)
	return
}

// CreateDeploymentVolumeMount func
func CreateDeploymentVolumeMount(client client.Interface, namespace string,
	deploymentName string, containerName string, vi common.VolumeInfo) (deploy *v1.Deployment, err error) {
	deploy, err = GetDeploymentDetailOriginal(client, namespace, deploymentName)
	if err != nil {
		return
	}
	fulfillDeploymentVolumeMount(deploy, namespace, containerName, vi)
	deploy, err = client.AppsV1().Deployments(namespace).Update(deploy)
	return
}

func fulfillDeploymentVolumeMount(deploy *v1.Deployment, namespace string, containerName string, vi common.VolumeInfo) {
	for index, container := range deploy.Spec.Template.Spec.Containers {
		if containerName == container.Name {
			deploy.Spec.Template.Spec.Containers[index].VolumeMounts, deploy.Spec.Template.Spec.Volumes = common.CreateContainerVolumeMount(
				container, deploy.Spec.Template.Spec.Volumes, vi)
			break
		}
	}
}

func GetFormCore(app appCore.Application) ([]v1.Deployment, error) {
	list := make([]v1.Deployment, 0)
	for _, r := range app.Resources {
		if r.GetKind() == api.ResourceKindDeployment {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*v1.Deployment, error) {
	if unstr == nil {
		return nil, errors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &v1.Deployment{}
	err = json.Unmarshal(data, output)
	return output, err
}
