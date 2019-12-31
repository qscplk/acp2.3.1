package artifactregistrymanager

import (
	"alauda.io/devops-apiserver/pkg/apis/devops"
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"encoding/json"
	"fmt"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(arm *v1alpha1.ArtifactRegistryManager) *ArtifactRegistryManager {
	crs := ArtifactRegistryManager{
		ObjectMeta: api.NewObjectMeta(arm.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindArtifactRegistryManager),
		Spec:       arm.Spec,
		Status:     arm.Status,
	}
	return &crs
}

func GetArtifactRegistryManager(client devopsclient.Interface, name string) (*v1alpha1.ArtifactRegistryManager, error) {
	crs, err := client.DevopsV1alpha1().ArtifactRegistryManagers().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func GetArtifactRegistryManagerBlobstore(client devopsclient.Interface, name string) (v1alpha1.BlobStoreOptionList, error) {
	result := v1alpha1.BlobStoreOptionList{}
	err := client.DevopsV1alpha1().RESTClient().Get().
		Resource("artifactregistrymanagers").
		Name(name).
		SubResource("blobstore").
		Do().
		Into(&result)

	return result, err
}

func GetArtifactRegistryManagerSub(client devopsclient.Interface, resource, name, sub string) (map[string]interface{}, error) {
	result := new(map[string]interface{})
	bs, err := client.DevopsV1alpha1().RESTClient().Get().
		Resource(resource).
		Name(name).
		SubResource(sub).
		Do().Raw()
	err = json.Unmarshal(bs, result)

	return *result, err
}

func UpdateArtifactRegistryManager(client devopsclient.Interface, newARM *v1alpha1.ArtifactRegistryManager, name string) (*v1alpha1.ArtifactRegistryManager, error) {
	oldARM, err := client.DevopsV1alpha1().ArtifactRegistryManagers().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldARM.SetAnnotations(newARM.GetAnnotations())
	oldARM.Spec = newARM.Spec

	oldARM, err = client.DevopsV1alpha1().ArtifactRegistryManagers().Update(oldARM)
	if err != nil {
		return nil, err
	}
	return oldARM, nil
}

func CreateArtifactRegistryManager(client devopsclient.Interface, arm *v1alpha1.ArtifactRegistryManager) (*v1alpha1.ArtifactRegistryManager, error) {
	return client.DevopsV1alpha1().ArtifactRegistryManagers().Create(arm)
}

func CreateArtifactRegistryManagerProject(client devopsclient.Interface, name string, body *devops.CreateProjectOptions) (*devops.ArtifactRegistry, error) {
	result := &devops.ArtifactRegistry{}
	err := client.DevopsV1alpha1().RESTClient().Post().Name(name).
		Resource("artifactregistrymanager").SubResource("project").
		Body(body).
		Do().
		Into(result)
	return result, err
}

func DeleteArtifactRegistryManager(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().ArtifactRegistryManagers().Delete(name, &v1.DeleteOptions{})
}

func AuthorizeService(client devopsclient.Interface, name, secretName, namespace string) (*v1alpha1.CodeRepoServiceAuthorizeResponse, error) {
	glog.Infof("Authorize the artifact registry manager %s with secret %s/%s", name, namespace, secretName)
	opts := v1alpha1.CodeRepoServiceAuthorizeOptions{
		SecretName: secretName,
		Namespace:  namespace,
	}
	authorizeResponse, err := client.DevopsV1alpha1().ArtifactRegistryManagers().Authorize(name, &opts)
	fmt.Println("authorizeResponse:", authorizeResponse, " err:", err)
	return authorizeResponse, err
}
