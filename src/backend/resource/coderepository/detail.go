package coderepository

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(codeRepository *v1alpha1.CodeRepository) *CodeRepository {
	crs := CodeRepository{
		ObjectMeta: api.NewObjectMeta(codeRepository.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeRepository),
		Spec:       codeRepository.Spec,
		Status:     codeRepository.Status,
	}
	return &crs
}

func GetCodeRepository(client devopsclient.Interface, namespace, name string) (*v1alpha1.CodeRepository, error) {
	crs, err := client.DevopsV1alpha1().CodeRepositories(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateCodeRepository(client devopsclient.Interface, newCodeRepository *v1alpha1.CodeRepository, namespace, name string) (*v1alpha1.CodeRepository, error) {
	oldCodeRepository, err := client.DevopsV1alpha1().CodeRepositories(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldCodeRepository.SetAnnotations(newCodeRepository.GetAnnotations())
	oldCodeRepository.Spec = newCodeRepository.Spec

	oldCodeRepository, err = client.DevopsV1alpha1().CodeRepositories(namespace).Update(oldCodeRepository)
	if err != nil {
		return nil, err
	}
	return oldCodeRepository, nil
}

func CreateCodeRepository(client devopsclient.Interface, codeRepository *v1alpha1.CodeRepository, namespace string) (*v1alpha1.CodeRepository, error) {
	return client.DevopsV1alpha1().CodeRepositories(namespace).Create(codeRepository)
}

func DeleteCodeRepository(client devopsclient.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().CodeRepositories(namespace).Delete(name, &v1.DeleteOptions{})
}
