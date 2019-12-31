package projectmanagementbinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func GetProjectManagementBinding(client devopsclient.Interface, namespace, name string) (*v1alpha1.ProjectManagementBinding, error) {
	crs, err := client.DevopsV1alpha1().ProjectManagementBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateProjectManagementBinding(client devopsclient.Interface, newProjectManagementBinding *v1alpha1.ProjectManagementBinding, namespace, name string) (*v1alpha1.ProjectManagementBinding, error) {
	oldProjectManagementBinding, err := GetProjectManagementBinding(client, namespace, name)
	if err != nil {
		return nil, err
	}

	binding := oldProjectManagementBinding.DeepCopy()
	binding.SetAnnotations(newProjectManagementBinding.GetAnnotations())
	binding.Spec = newProjectManagementBinding.Spec
	return client.DevopsV1alpha1().ProjectManagementBindings(newProjectManagementBinding.Namespace).Update(binding)
}

func CreateProjectManagementBinding(client devopsclient.Interface, codeRepoBinding *v1alpha1.ProjectManagementBinding, namespace string) (*v1alpha1.ProjectManagementBinding, error) {
	glog.V(3).Infof("create the projectmanagebinding %s", codeRepoBinding.GetName())
	return client.DevopsV1alpha1().ProjectManagementBindings(namespace).Create(codeRepoBinding)
}

func DeleteProjectManagementBinding(client devopsclient.Interface, namespace, name string) error {
	glog.V(3).Infof("delete the projectmanagebinding %s", name)
	return client.DevopsV1alpha1().ProjectManagementBindings(namespace).Delete(name, &v1.DeleteOptions{})
}
