package testtoolbinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func GetTestToolBinding(client devopsclient.Interface, namespace, name string) (*v1alpha1.TestToolBinding, error) {
	crs, err := client.DevopsV1alpha1().TestToolBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateTestToolBinding(client devopsclient.Interface, newTestToolBinding *v1alpha1.TestToolBinding, namespace, name string) (*v1alpha1.TestToolBinding, error) {
	oldTestToolBinding, err := GetTestToolBinding(client, namespace, name)
	if err != nil {
		return nil, err
	}

	binding := oldTestToolBinding.DeepCopy()
	binding.SetAnnotations(newTestToolBinding.GetAnnotations())
	binding.Spec = newTestToolBinding.Spec
	return client.DevopsV1alpha1().TestToolBindings(newTestToolBinding.Namespace).Update(binding)
}

func CreateTestToolBinding(client devopsclient.Interface, codeRepoBinding *v1alpha1.TestToolBinding, namespace string) (*v1alpha1.TestToolBinding, error) {
	glog.V(3).Infof("create the testtoolbinding %s", codeRepoBinding.GetName())
	return client.DevopsV1alpha1().TestToolBindings(namespace).Create(codeRepoBinding)
}

func DeleteTestToolBinding(client devopsclient.Interface, namespace, name string) error {
	glog.V(3).Infof("delete the testtoolbinding %s", name)
	return client.DevopsV1alpha1().TestToolBindings(namespace).Delete(name, &v1.DeleteOptions{})
}
