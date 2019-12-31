package imagerepository

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(imageRepository *v1alpha1.ImageRepository) *ImageRepository {
	ir := ImageRepository{
		ObjectMeta: api.NewObjectMeta(imageRepository.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindImageRepository),
		Spec:       imageRepository.Spec,
		Status:     imageRepository.Status,
	}
	return &ir
}

func GetImageRepository(client devopsclient.Interface, namespace, name string) (*v1alpha1.ImageRepository, error) {
	ir, err := client.DevopsV1alpha1().ImageRepositories(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return ir, nil
}

func UpdateImageRepository(client devopsclient.Interface, newImageRepository *v1alpha1.ImageRepository, namespace, name string) (*v1alpha1.ImageRepository, error) {
	oldImageRepository, err := client.DevopsV1alpha1().ImageRepositories(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldImageRepository.SetAnnotations(newImageRepository.GetAnnotations())
	oldImageRepository.Spec = newImageRepository.Spec

	oldImageRepository, err = client.DevopsV1alpha1().ImageRepositories(namespace).Update(oldImageRepository)
	if err != nil {
		return nil, err
	}
	return oldImageRepository, nil
}

func CreateImageRepository(client devopsclient.Interface, imageRepository *v1alpha1.ImageRepository, namespace string) (*v1alpha1.ImageRepository, error) {
	return client.DevopsV1alpha1().ImageRepositories(namespace).Create(imageRepository)
}

func DeleteImageRepository(client devopsclient.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().ImageRepositories(namespace).Delete(name, &v1.DeleteOptions{})
}
