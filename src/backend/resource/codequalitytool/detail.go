package codequalitytool

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"fmt"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func GetCodeQualityTool(client devopsclient.Interface, name string) (*v1alpha1.CodeQualityTool, error) {
	crs, err := client.DevopsV1alpha1().CodeQualityTools().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	return crs, nil
}

func UpdateCodeQualityTool(client devopsclient.Interface, newCodeQualityTool *v1alpha1.CodeQualityTool, name string) (*v1alpha1.CodeQualityTool, error) {
	oldCodeQualityTool, err := client.DevopsV1alpha1().CodeQualityTools().Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	oldCodeQualityTool.SetAnnotations(newCodeQualityTool.GetAnnotations())
	oldCodeQualityTool.Spec = newCodeQualityTool.Spec

	oldCodeQualityTool, err = client.DevopsV1alpha1().CodeQualityTools().Update(oldCodeQualityTool)
	if err != nil {
		return nil, err
	}
	return oldCodeQualityTool, nil
}

func CreateCodeQualityTool(client devopsclient.Interface, codeQualityTool *v1alpha1.CodeQualityTool) (*v1alpha1.CodeQualityTool, error) {
	return client.DevopsV1alpha1().CodeQualityTools().Create(codeQualityTool)
}

func DeleteCodeQualityTool(client devopsclient.Interface, name string) error {
	return client.DevopsV1alpha1().CodeQualityTools().Delete(name, &v1.DeleteOptions{})
}

func AuthorizeService(client devopsclient.Interface, codeQualityToolName, secretName, namespace string) (*v1alpha1.CodeRepoServiceAuthorizeResponse, error) {
	fmt.Printf("Authorize the codeQualityTool %s with secret %s/%s", codeQualityToolName, namespace, secretName)
	opts := v1alpha1.CodeRepoServiceAuthorizeOptions{
		SecretName: secretName,
		Namespace:  namespace,
	}
	authorizeResponse, err := client.DevopsV1alpha1().CodeQualityTools().Authorize(codeQualityToolName, &opts)
	fmt.Printf("authorizeReponse: %#v \n err: %#v \n", authorizeResponse, err)
	return authorizeResponse, err
}
