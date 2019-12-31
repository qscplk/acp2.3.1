package jenkinsbinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/pipelineconfig"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func DeleteJenkinsBinding(client devopsclient.Interface, namespace, name string) error {
	return client.DevopsV1alpha1().JenkinsBindings(namespace).Delete(name, &v1.DeleteOptions{})
}

func GetJenkinsBinding(client devopsclient.Interface, namespace, name string) (*v1alpha1.JenkinsBinding, error) {
	crs, err := client.DevopsV1alpha1().JenkinsBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func GetJenkinsBindingResources(client devopsclient.Interface, namespace, name string) (resourceList *common.ResourceList, err error) {
	dsQuery := dataselect.GeSimpleFieldQuery(dataselect.JenkinsBindingProperty, name)
	items := pipelineconfig.GetPipelineConfigListAsResourceList(client, namespace, dsQuery)
	resourceList = &common.ResourceList{
		Items: items,
	}
	return
}

func UpdateJenkinsBinding(client devopsclient.Interface, oldJenkinsBinding, newJenkinsBinding *v1alpha1.JenkinsBinding) (*v1alpha1.JenkinsBinding, error) {
	glog.V(5).Infof("update the jenkinsbinding %s", newJenkinsBinding.GetName())
	binding := oldJenkinsBinding.DeepCopy()
	binding.SetAnnotations(newJenkinsBinding.GetAnnotations())
	binding.Spec = newJenkinsBinding.Spec
	return client.DevopsV1alpha1().JenkinsBindings(newJenkinsBinding.Namespace).Update(binding)
}

func CreateJenkinsBinding(client devopsclient.Interface, jenkinsBinding *v1alpha1.JenkinsBinding, namespace string) (*v1alpha1.JenkinsBinding, error) {
	glog.V(5).Infof("create the jenkinsbinding %s", jenkinsBinding.GetName())
	return client.DevopsV1alpha1().JenkinsBindings(namespace).Create(jenkinsBinding)
}
