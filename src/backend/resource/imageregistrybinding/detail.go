package imageregistrybinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	k8serror "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(imageRegistryBinding *v1alpha1.ImageRegistryBinding) *ImageRegistryBinding {
	irb := ImageRegistryBinding{
		ObjectMeta: api.NewObjectMeta(imageRegistryBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindImageRegistryBinding),
		Spec:       imageRegistryBinding.Spec,
		Status:     imageRegistryBinding.Status,
	}
	return &irb
}

func GetImageRegistryBinding(client devopsclient.Interface, namespace, name string) (*v1alpha1.ImageRegistryBinding, error) {
	irb, err := client.DevopsV1alpha1().ImageRegistryBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return irb, nil
}

func UpdateImageRegistryBinding(client devopsclient.Interface, oldImageRegistryBinding, newImageRegistryBinding *v1alpha1.ImageRegistryBinding) (newbinding *v1alpha1.ImageRegistryBinding, err error) {
	binding := oldImageRegistryBinding.DeepCopy()
	binding.SetAnnotations(newImageRegistryBinding.GetAnnotations())
	binding.Spec = newImageRegistryBinding.Spec

	namespace := binding.Namespace
	name := binding.Name

	retry := 2
	for retry > 0 {
		bindingversion, err := client.DevopsV1alpha1().ImageRegistryBindings(namespace).Get(name, api.GetOptionsInCache)
		if err != nil {
			return nil, err
		}
		binding.SetResourceVersion(bindingversion.ResourceVersion)

		newbinding, err = client.DevopsV1alpha1().ImageRegistryBindings(newImageRegistryBinding.Namespace).Update(binding)
		if !k8serror.IsConflict(err) {
			break
		}
		retry--
	}

	return
}

func CreateImageRegistryBinding(client devopsclient.Interface, imageRegistryBinding *v1alpha1.ImageRegistryBinding, namespace string) (*v1alpha1.ImageRegistryBinding, error) {
	return client.DevopsV1alpha1().ImageRegistryBindings(namespace).Create(imageRegistryBinding)
}

func DeleteImageRegistryBinding(client devopsclient.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().ImageRegistryBindings(namespace).Delete(name, &v1.DeleteOptions{})
}
