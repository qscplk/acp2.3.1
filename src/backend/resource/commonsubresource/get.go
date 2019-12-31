package commonsubresource

import (
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"encoding/json"
)

func GetResourceSub(client devopsclient.Interface, namespace, resource, name, sub string, parameters map[string]string) (map[string]interface{}, error) {
	result := new(map[string]interface{})

	request := client.DevopsV1alpha1().RESTClient().Get().
		Resource(resource).
		Name(name).
		SubResource(sub)

	if namespace != "" {
		request.Namespace(namespace)
	}

	for k, v := range parameters {
		request.Param(k, v)
	}

	bs, err := request.Do().Raw()

	err = json.Unmarshal(bs, result)

	return *result, err
}
