package artifactregistry

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"fmt"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(arm *v1alpha1.ArtifactRegistry) *ArtifactRegistry {
	crs := ArtifactRegistry{
		ObjectMeta: api.NewObjectMeta(arm.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindArtifactRegistry),
		Spec:       arm.Spec,
		Status:     arm.Status,
	}
	return &crs
}

func GetArtifactRegistry(client devopsclient.Interface, name string) (*v1alpha1.ArtifactRegistry, error) {
	crs, err := client.DevopsV1alpha1().ArtifactRegistries().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateArtifactRegistry(client devopsclient.Interface, newARM *v1alpha1.ArtifactRegistry, name string) (*v1alpha1.ArtifactRegistry, error) {
	oldARM, err := client.DevopsV1alpha1().ArtifactRegistries().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldARM.SetAnnotations(newARM.GetAnnotations())
	oldARM.Spec = newARM.Spec

	oldARM, err = client.DevopsV1alpha1().ArtifactRegistries().Update(oldARM)
	if err != nil {
		return nil, err
	}
	return oldARM, nil
}

func CreateArtifactRegistry(client devopsclient.Interface, arm *v1alpha1.ArtifactRegistry) (*v1alpha1.ArtifactRegistry, error) {
	return client.DevopsV1alpha1().ArtifactRegistries().Create(arm)
}

func DeleteArtifactRegistry(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().ArtifactRegistries().Delete(name, &v1.DeleteOptions{})
}

func AuthorizeService(client devopsclient.Interface, name, secretName, namespace string) (*v1alpha1.CodeRepoServiceAuthorizeResponse, error) {
	glog.Infof("Authorize the artifactregistry %s with secret %s/%s", name, namespace, secretName)
	opts := v1alpha1.CodeRepoServiceAuthorizeOptions{
		SecretName: secretName,
		Namespace:  namespace,
	}
	authorizeResponse, err := client.DevopsV1alpha1().ArtifactRegistries().Authorize(name, &opts)
	fmt.Println("authorizeResponse:", authorizeResponse, " err:", err)
	return authorizeResponse, err
}
