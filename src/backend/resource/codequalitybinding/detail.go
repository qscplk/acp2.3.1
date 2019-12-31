package codequalitybinding

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(codeQualityBinding *v1alpha1.CodeQualityBinding) *CodeQualityBinding {
	crs := CodeQualityBinding{
		ObjectMeta: api.NewObjectMeta(codeQualityBinding.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeQualityBinding),
		Spec:       codeQualityBinding.Spec,
		Status:     codeQualityBinding.Status,
	}
	return &crs
}

func GetCodeQualityBinding(client devopsclient.Interface, namespace, name string) (*v1alpha1.CodeQualityBinding, error) {
	crs, err := client.DevopsV1alpha1().CodeQualityBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateCodeQualityBinding(client devopsclient.Interface, oldCodeQualityBinding, newCodeQualityBinding *v1alpha1.CodeQualityBinding) (*v1alpha1.CodeQualityBinding, error) {
	glog.V(3).Infof("update the codequalitybinding %s", newCodeQualityBinding.GetName())
	binding := oldCodeQualityBinding.DeepCopy()
	binding.SetAnnotations(newCodeQualityBinding.GetAnnotations())
	binding.Spec = newCodeQualityBinding.Spec
	return client.DevopsV1alpha1().CodeQualityBindings(newCodeQualityBinding.Namespace).Update(binding)
}

func CreateCodeQualityBinding(client devopsclient.Interface, codeQualityBinding *v1alpha1.CodeQualityBinding, namespace string) (*v1alpha1.CodeQualityBinding, error) {
	glog.V(3).Infof("create the codequalitybinding %s", codeQualityBinding.GetName())
	return client.DevopsV1alpha1().CodeQualityBindings(namespace).Create(codeQualityBinding)
}

func DeleteCodeQualityBinding(client devopsclient.Interface, namespace, name string) error {
	glog.V(3).Infof("delete the codequalitybinding %s", name)
	return client.DevopsV1alpha1().CodeQualityBindings(namespace).Delete(name, &v1.DeleteOptions{})
}
