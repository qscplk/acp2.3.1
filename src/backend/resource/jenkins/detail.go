package jenkins

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"fmt"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

// UpdateJenkins Updates a jenkins instance in the API server
func UpdateJenkins(client devopsclient.Interface, newJenkins *v1alpha1.Jenkins, name string) (*v1alpha1.Jenkins, error) {
	oldJenkins, err := client.DevopsV1alpha1().Jenkinses().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldJenkins.SetAnnotations(newJenkins.GetAnnotations())
	oldJenkins.Spec = newJenkins.Spec

	oldJenkins, err = client.DevopsV1alpha1().Jenkinses().Update(oldJenkins)
	if err != nil {
		return nil, err
	}
	return oldJenkins, nil
}

// CreateJenkins creates a Jenkins instance in the API server
func CreateJenkins(client devopsclient.Interface, newJenkins *v1alpha1.Jenkins) (*v1alpha1.Jenkins, error) {
	return client.DevopsV1alpha1().Jenkinses().Create(newJenkins)
}

// RetrieveJenkins fetches a Jenkins instance from API
func RetrieveJenkins(client devopsclient.Interface, name string) (*v1alpha1.Jenkins, error) {
	return client.DevopsV1alpha1().Jenkinses().Get(name, api.GetOptionsInCache)
}

// RetrieveJenkins delete a Jenkins instance in the API server
func DeleteJenkins(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().Jenkinses().Delete(name, &v1.DeleteOptions{})
}

func GetJenkinsResources(client devopsclient.Interface, name string) (resourceList *common.ResourceList, err error) {
	// todo
	return
}

func AuthorizeService(client devopsclient.Interface, jenkinsName, secretName, namespace string) (*v1alpha1.CodeRepoServiceAuthorizeResponse, error) {
	glog.Infof("Authorize the jenkins %s with secret %s/%s", jenkinsName, namespace, secretName)
	opts := v1alpha1.CodeRepoServiceAuthorizeOptions{
		SecretName: secretName,
		Namespace:  namespace,
	}
	authorizeResponse, err := client.DevopsV1alpha1().Jenkinses().Authorize(jenkinsName, &opts)
	fmt.Println("authorizeResponse:", authorizeResponse, " err:", err)
	return authorizeResponse, err
}
