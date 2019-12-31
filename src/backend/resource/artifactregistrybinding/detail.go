package artifactregistrybinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(arm *v1alpha1.ArtifactRegistryBinding) *ArtifactRegistryBinding {
	crs := ArtifactRegistryBinding{
		ObjectMeta: api.NewObjectMeta(arm.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindArtifactRegistryBinding),
		Spec:       arm.Spec,
		Status:     arm.Status,
	}
	return &crs
}

func GetArtifactRegistryBinding(client devopsclient.Interface, name, namespace string) (*v1alpha1.ArtifactRegistryBinding, error) {
	crs, err := client.DevopsV1alpha1().ArtifactRegistryBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateArtifactRegistryBinding(client devopsclient.Interface, newARM *v1alpha1.ArtifactRegistryBinding, name string) (*v1alpha1.ArtifactRegistryBinding, error) {
	oldARM, err := client.DevopsV1alpha1().ArtifactRegistryBindings(newARM.Namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldARM.SetAnnotations(newARM.GetAnnotations())
	oldARM.Spec = newARM.Spec

	oldARM, err = client.DevopsV1alpha1().ArtifactRegistryBindings(newARM.Namespace).Update(oldARM)
	if err != nil {
		return nil, err
	}
	return oldARM, nil
}

func CreateArtifactRegistryBinding(client devopsclient.Interface, arm *v1alpha1.ArtifactRegistryBinding) (*v1alpha1.ArtifactRegistryBinding, error) {
	return client.DevopsV1alpha1().ArtifactRegistryBindings(arm.Namespace).Create(arm)
}

func DeleteArtifactRegistryBinding(client devopsclient.Interface, name, namespace string) error {
	return client.DevopsV1alpha1().ArtifactRegistryBindings(namespace).Delete(name, &v1.DeleteOptions{})
}
