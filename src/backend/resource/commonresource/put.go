package commonresource

import (
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"encoding/json"
)

func PutResource(client devopsclient.Interface, namespace, resource, name string, parameters map[string]string, body interface{}) (map[string]interface{}, error) {
	result := new(map[string]interface{})

	request := client.DevopsV1alpha1().RESTClient().Put().
		Resource(resource).Name(name).
		Body(body)
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
