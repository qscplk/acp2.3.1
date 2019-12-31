package commonresource

import (
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/devops-apiserver/pkg/client/clientset/versioned/scheme"
	"alauda.io/diablo/src/backend/api"
	"encoding/json"
	"log"
)

type ListResult struct {
	ListMeta api.ListMeta `json:"listMeta"`

	Items []interface{} `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func GetResource(client devopsclient.Interface, namespace, resource, name string, parameters map[string]string) (map[string]interface{}, error) {
	logName := "GetResource"

	result := new(map[string]interface{})

	request := client.DevopsV1alpha1().RESTClient().Get().
		Resource(resource).VersionedParams(&api.GetOptionsInCache, scheme.ParameterCodec)

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

func GetResourceList(client devopsclient.Interface, namespace, resource string, parameters map[string]string) (ListResult, error) {
	logName := "GetResource"

	result := new(map[string]interface{})

	request := client.DevopsV1alpha1().RESTClient().Get().
		Resource(resource).VersionedParams(&api.GetOptionsInCache, scheme.ParameterCodec)

	if namespace != "" {
		request.Namespace(namespace)
	}

	for k, v := range parameters {
		request.Param(k, v)
	}

	bs, err := request.Do().Raw()

	log.Printf("%s bs is %#v", logName, string(bs))

	err = json.Unmarshal(bs, result)

	items := (*result)["items"].([]interface{})

	listResult := ListResult{Items: items, ListMeta: api.ListMeta{
		TotalItems: len(items),
	}, Errors: []error{err},
	}

	return listResult, err
}
