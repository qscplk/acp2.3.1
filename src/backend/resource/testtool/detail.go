package testtool

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func GetTestTool(client devopsclient.Interface, name string) (*v1alpha1.TestTool, error) {
	crs, err := client.DevopsV1alpha1().TestTools().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateTestTool(client devopsclient.Interface, newTestTool *v1alpha1.TestTool, name string) (*v1alpha1.TestTool, error) {
	oldTestTool, err := client.DevopsV1alpha1().TestTools().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldTestTool.SetAnnotations(newTestTool.GetAnnotations())
	oldTestTool.Spec = newTestTool.Spec

	oldTestTool, err = client.DevopsV1alpha1().TestTools().Update(oldTestTool)
	if err != nil {
		return nil, err
	}
	return oldTestTool, nil
}

func CreateTestTool(client devopsclient.Interface, testtool *v1alpha1.TestTool) (*v1alpha1.TestTool, error) {
	return client.DevopsV1alpha1().TestTools().Create(testtool)
}

func DeleteTestTool(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().TestTools().Delete(name, &v1.DeleteOptions{})
}
