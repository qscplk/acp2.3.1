package virtualservice

import (
	"fmt"

	"alauda.io/diablo/src/backend/api"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

func GetVirtualServiceDetail(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) (*unstructured.Unstructured, error) {
	return dyclient.Namespace(namespace).Get(name, api.GetOptionsInCache)
}

func convertToDetailOptions(hostName string) (ls v1.ListOptions) {
	ls = api.ListEverything
	if hostName == "" {
		return
	}
	ls.LabelSelector = fmt.Sprintf("%s in (%s)", HostName, hostName)
	return ls
}

func GetVirtualServiceDetailByHost(dyclient dynamic.NamespaceableResourceInterface, namespace string, host string) (*unstructured.Unstructured, error) {
	listOptions := convertToDetailOptions(host)
	obj, err := dyclient.Namespace(namespace).List(listOptions)
	if err != nil {
		return nil, err
	}
	if obj.Items == nil && len(obj.Items) == 0 {
		return nil, fmt.Errorf("%s", host)
	}

	return &obj.Items[0], nil
}
