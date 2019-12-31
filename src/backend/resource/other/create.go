package other

import (
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

func CreateResource(client dynamic.NamespaceableResourceInterface, namespace string, payload *unstructured.Unstructured) error {
	_, err := client.Namespace(namespace).Create(payload, v1.CreateOptions{})
	return err
}
