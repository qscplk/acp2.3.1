package projectmanagement

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func GetProjectManagement(client devopsclient.Interface, name string) (*v1alpha1.ProjectManagement, error) {
	crs, err := client.DevopsV1alpha1().ProjectManagements().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateProjectManagement(client devopsclient.Interface, newProjectManagement *v1alpha1.ProjectManagement, name string) (*v1alpha1.ProjectManagement, error) {
	oldProjectManagement, err := client.DevopsV1alpha1().ProjectManagements().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldProjectManagement.SetAnnotations(newProjectManagement.GetAnnotations())
	oldProjectManagement.Spec = newProjectManagement.Spec

	oldProjectManagement, err = client.DevopsV1alpha1().ProjectManagements().Update(oldProjectManagement)
	if err != nil {
		return nil, err
	}
	return oldProjectManagement, nil
}

func CreateProjectManagement(client devopsclient.Interface, jira *v1alpha1.ProjectManagement) (*v1alpha1.ProjectManagement, error) {
	return client.DevopsV1alpha1().ProjectManagements().Create(jira)
}

func DeleteProjectManagement(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().ProjectManagements().Delete(name, &v1.DeleteOptions{})
}
