package commonresource

import (
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"encoding/json"
	"log"
)

func DeleteResource(client devopsclient.Interface, namespace, resource, name string, parameters map[string]string) (map[string]interface{}, error) {
	logName := "GetResource"

	result := new(map[string]interface{})

	request := client.DevopsV1alpha1().RESTClient().Delete().
		Resource(resource)

	if namespace != "" {
		request.Namespace(namespace)
	}

	if name != "" {
		request.Name(name)
	}

	for k, v := range parameters {
		request.Param(k, v)
	}

	bs, err := request.Do().Raw()

	log.Printf("%s bs is %#v", logName, string(bs))

	err = json.Unmarshal(bs, result)

	return *result, err
}
