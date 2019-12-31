package policy

import (
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

func GetPolicyDetail(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) (*unstructured.Unstructured, error) {
	return dyclient.Namespace(namespace).Get(name, v1.GetOptions{})
}
