package imageregistry

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"fmt"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(imageRegistry *v1alpha1.ImageRegistry) *ImageRegistry {
	ir := ImageRegistry{
		ObjectMeta: api.NewObjectMeta(imageRegistry.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindImageRegistry),
		Spec:       imageRegistry.Spec,
		Status:     imageRegistry.Status,
	}
	return &ir
}

func GetImageRegistry(client devopsclient.Interface, name string) (*v1alpha1.ImageRegistry, error) {
	ir, err := client.DevopsV1alpha1().ImageRegistries().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return ir, nil
}

func UpdateImageRegistry(client devopsclient.Interface, newImageRegistry *v1alpha1.ImageRegistry, name string) (*v1alpha1.ImageRegistry, error) {
	oldImageRegistry, err := client.DevopsV1alpha1().ImageRegistries().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldImageRegistry.SetAnnotations(newImageRegistry.GetAnnotations())
	oldImageRegistry.Spec = newImageRegistry.Spec

	oldImageRegistry, err = client.DevopsV1alpha1().ImageRegistries().Update(oldImageRegistry)
	if err != nil {
		return nil, err
	}
	return oldImageRegistry, nil
}

func CreateImageRegistry(client devopsclient.Interface, imageRegistry *v1alpha1.ImageRegistry) (*v1alpha1.ImageRegistry, error) {
	return client.DevopsV1alpha1().ImageRegistries().Create(imageRegistry)
}

func DeleteImageRegistry(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().ImageRegistries().Delete(name, &v1.DeleteOptions{})
}

func AuthorizeService(client devopsclient.Interface, imageRegistryName, secretName, namespace string) (*v1alpha1.CodeRepoServiceAuthorizeResponse, error) {
	glog.Infof("Authorize the imageRegistry %s with secret %s/%s", imageRegistryName, namespace, secretName)
	opts := v1alpha1.CodeRepoServiceAuthorizeOptions{
		SecretName: secretName,
		Namespace:  namespace,
	}
	authorizeResponse, err := client.DevopsV1alpha1().ImageRegistries().Authorize(imageRegistryName, &opts)
	fmt.Println("authorizeResponse:", authorizeResponse, " err:", err)
	return authorizeResponse, err
}
