package codereposervice

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"fmt"
	"github.com/golang/glog"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func toDetails(codeRepoService *v1alpha1.CodeRepoService) *CodeRepoService {
	crs := CodeRepoService{
		ObjectMeta: api.NewObjectMeta(codeRepoService.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeRepoService),
		Spec:       codeRepoService.Spec,
		Status:     codeRepoService.Status,
	}
	return &crs
}

func GetCodeRepoService(client devopsclient.Interface, name string) (*v1alpha1.CodeRepoService, error) {
	crs, err := client.DevopsV1alpha1().CodeRepoServices().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateCodeRepoService(client devopsclient.Interface, newCodeRepoService *v1alpha1.CodeRepoService, name string) (*v1alpha1.CodeRepoService, error) {
	oldCodeRepoService, err := client.DevopsV1alpha1().CodeRepoServices().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldCodeRepoService.SetAnnotations(newCodeRepoService.GetAnnotations())
	oldCodeRepoService.Spec = newCodeRepoService.Spec

	oldCodeRepoService, err = client.DevopsV1alpha1().CodeRepoServices().Update(oldCodeRepoService)
	if err != nil {
		return nil, err
	}
	return oldCodeRepoService, nil
}

func CreateCodeRepoService(client devopsclient.Interface, codeRepoService *v1alpha1.CodeRepoService) (*v1alpha1.CodeRepoService, error) {
	return client.DevopsV1alpha1().CodeRepoServices().Create(codeRepoService)
}

func DeleteCodeRepoService(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().CodeRepoServices().Delete(name, &v1.DeleteOptions{})
}

func AuthorizeService(client devopsclient.Interface, codeRepoServiceName, secretName, namespace string) (*v1alpha1.CodeRepoServiceAuthorizeResponse, error) {
	glog.Infof("Authorize the codeRepoService %s with secret %s/%s", codeRepoServiceName, namespace, secretName)
	opts := v1alpha1.CodeRepoServiceAuthorizeOptions{
		SecretName: secretName,
		Namespace:  namespace,
	}
	authorizeResponse, err := client.DevopsV1alpha1().CodeRepoServices().Authorize(codeRepoServiceName, &opts)
	fmt.Println("authorizeResponse:", authorizeResponse, " err:", err)
	return authorizeResponse, err
}
