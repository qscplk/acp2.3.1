package microservice

import (
	"encoding/json"
	"log"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	Group                            = "asm.alauda.io"
	Version                          = "v1beta2"
	Kind                             = "MicroService"
	MicroServiceCreatorLabel         = "asm.alauda.io/mscreator"
	MicroServiceDeploymentAnnotation = "asm.alauda.io/msdeployments"
	ASMCREATERESOURCE                = "ASM_CREATE"
)

var (
	GVK = schema.GroupVersionKind{
		Group:   Group,
		Version: Version,
		Kind:    Kind,
	}
)

func GetMicroServiceFromUnstructured(r *unstructured.Unstructured) (*MicroService, error) {
	b, err := json.Marshal(r.Object)
	if err != nil {
		log.Printf("error GetMicroServiceFromUnstructured json marshal : %v ,%v", err, r)
		return nil, err
	}
	var a MicroService
	if err := json.Unmarshal(b, &a); err != nil {
		log.Printf("error GetMicroServiceFromUnstructured Unmarshal: %v", err)
		return nil, err
	}
	return &a, nil
}

func GetUnstructuredFromMicroService(spec *MicroService) (*unstructured.Unstructured, error) {
	b, err := json.Marshal(spec)
	if err != nil {
		log.Printf("error GetUnstructuredFromMicroService json marshal : %v ,%v", err, spec)
		return nil, err
	}
	var a unstructured.Unstructured
	if err := json.Unmarshal(b, &a); err != nil {
		log.Printf("error GetUnstructuredFromMicroService Unmarshal: %v", err)
		return nil, err
	}
	return &a, nil
}
