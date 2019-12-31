package asmConfig

import (
	"encoding/json"
	"log"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	Group   = "asm.alauda.io"
	Version = "v1beta1"
	Kind    = "ClusterConfig"
)

var (
	GVK = schema.GroupVersionKind{
		Group:   Group,
		Version: Version,
		Kind:    Kind,
	}
)

func ClusterConfigFromUnstructured(r *unstructured.Unstructured) (*ClusterConfig, error) {
	b, err := json.Marshal(r.Object)
	if err != nil {

		log.Fatalf("error ReleaseFromUnstructured json marshal : %v ,%v", err, r)
		return nil, err
	}
	var a ClusterConfig
	if err := json.Unmarshal(b, &a); err != nil {
		log.Fatalf("error ReleaseFromUnstructured Unmarshal: %v", err)
		return nil, err
	}
	return &a, nil
}
