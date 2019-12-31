package coderepobinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"github.com/golang/glog"
	k8serror "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(codeRepoBinding *v1alpha1.CodeRepoBinding) *CodeRepoBinding {
	crs := CodeRepoBinding{
		ObjectMeta: api.NewObjectMeta(codeRepoBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeRepoBinding),
		Spec:       codeRepoBinding.Spec,
		Status:     codeRepoBinding.Status,
	}
	return &crs
}

func GetCodeRepoBinding(client devopsclient.Interface, namespace, name string) (*v1alpha1.CodeRepoBinding, error) {
	crs, err := client.DevopsV1alpha1().CodeRepoBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateCodeRepoBinding(client devopsclient.Interface, oldCodeRepoBinding, newCodeRepoBinding *v1alpha1.CodeRepoBinding) (newbinding *v1alpha1.CodeRepoBinding, err error) {
	glog.V(3).Infof("update the coderepobinding %s", newCodeRepoBinding.GetName())
	binding := oldCodeRepoBinding.DeepCopy()
	binding.SetAnnotations(newCodeRepoBinding.GetAnnotations())
	binding.Spec = newCodeRepoBinding.Spec

	namespace := binding.Namespace
	name := binding.Name

	retry := 2
	for retry > 0 {
		bindingversion, err := client.DevopsV1alpha1().CodeRepoBindings(namespace).Get(name, api.GetOptionsInCache)
		if err != nil {
			return nil, err
		}
		binding.SetResourceVersion(bindingversion.ResourceVersion)
		newbinding, err = client.DevopsV1alpha1().CodeRepoBindings(newCodeRepoBinding.Namespace).Update(binding)
		if !k8serror.IsConflict(err) {
			break
		}
		retry--
	}
	return
}

func CreateCodeRepoBinding(client devopsclient.Interface, codeRepoBinding *v1alpha1.CodeRepoBinding, namespace string) (*v1alpha1.CodeRepoBinding, error) {
	glog.V(3).Infof("create the coderepobinding %s", codeRepoBinding.GetName())
	return client.DevopsV1alpha1().CodeRepoBindings(namespace).Create(codeRepoBinding)
}

func DeleteCodeRepoBinding(client devopsclient.Interface, namespace, name string) error {
	glog.V(3).Infof("delete the coderepobinding %s", name)
	return client.DevopsV1alpha1().CodeRepoBindings(namespace).Delete(name, &v1.DeleteOptions{})
}
