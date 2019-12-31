package destinationrule

import (
	"alauda.io/diablo/src/backend/api"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

func GetDestinationRuleDetail(dyclient dynamic.NamespaceableResourceInterface, namespace string, name string) (*unstructured.Unstructured, error) {
	return dyclient.Namespace(namespace).Get(name, api.GetOptionsInCache)
}
