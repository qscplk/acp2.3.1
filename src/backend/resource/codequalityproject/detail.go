package codequalityproject

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(codeQualityProject *v1alpha1.CodeQualityProject) *CodeQualityProject {
	crs := CodeQualityProject{
		ObjectMeta: api.NewObjectMeta(codeQualityProject.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeQualityProject),
		Spec:       codeQualityProject.Spec,
		Status:     codeQualityProject.Status,
	}
	return &crs
}

func GetCodeQualityProject(client devopsclient.Interface, namespace, name string) (*v1alpha1.CodeQualityProject, error) {
	crs, err := client.DevopsV1alpha1().CodeQualityProjects(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateCodeQualityProject(client devopsclient.Interface, newCodeQualityProject *v1alpha1.CodeQualityProject, namespace, name string) (*v1alpha1.CodeQualityProject, error) {
	oldCodeQualityProject, err := client.DevopsV1alpha1().CodeQualityProjects(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldCodeQualityProject.SetAnnotations(newCodeQualityProject.GetAnnotations())
	oldCodeQualityProject.Spec = newCodeQualityProject.Spec

	oldCodeQualityProject, err = client.DevopsV1alpha1().CodeQualityProjects(namespace).Update(oldCodeQualityProject)
	if err != nil {
		return nil, err
	}
	return oldCodeQualityProject, nil
}

func CreateCodeQualityProject(client devopsclient.Interface, codeQualityProject *v1alpha1.CodeQualityProject, namespace string) (*v1alpha1.CodeQualityProject, error) {
	return client.DevopsV1alpha1().CodeQualityProjects(namespace).Create(codeQualityProject)
}

func DeleteCodeQualityProject(client devopsclient.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().CodeQualityProjects(namespace).Delete(name, &v1.DeleteOptions{})
}
