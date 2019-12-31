package other

import (
	"encoding/json"
	"fmt"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/event"
	coreV1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

type OtherResourceDetail struct {
	ObjectMeta api.ObjectMeta             `json:"objectMeta"`
	TypeMeta   ResourceTypeMeta           `json:"typeMeta"`
	Data       *unstructured.Unstructured `json:"data"`
	Events     []coreV1.Event             `json:"events"`
}

func GetResourceDetail(dyclient dynamic.NamespaceableResourceInterface, k8sclient kubernetes.Interface, namespace, name string) (*OtherResourceDetail, error) {
	r, err := dyclient.Namespace(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}
	result := OtherResourceDetail{
		ObjectMeta: api.ObjectMeta{
			Name:              r.GetName(),
			Namespace:         r.GetNamespace(),
			Labels:            r.GetLabels(),
			Annotations:       r.GetAnnotations(),
			CreationTimestamp: r.GetCreationTimestamp(),
		},
		TypeMeta: ResourceTypeMeta{
			Name:         r.GetName(),
			Kind:         r.GetKind(),
			GroupVersion: r.GetAPIVersion(),
		},
	}

	result.Data = r

	if r.GetUID() != "" {
		events, err := event.GetEventsByUid(k8sclient, string(r.GetUID()))
		if err != nil {
			return nil, err
		}
		result.Events = events
	}
	return &result, nil
}

func DeleteResource(client dynamic.NamespaceableResourceInterface, resource *v1.APIResource, namespace string, name string) error {
	err := client.Namespace(namespace).Delete(name, &v1.DeleteOptions{})
	return err
}

func UpdateResource(client dynamic.NamespaceableResourceInterface, namespace string, name string, payload *unstructured.Unstructured) error {
	if payload.GetName() != name || payload.GetNamespace() != namespace {
		return fmt.Errorf("can not update name and namespace field")
	}

	_, err := client.Namespace(namespace).Update(payload, v1.UpdateOptions{})
	return err
}

func PatchResource(client dynamic.NamespaceableResourceInterface, namespace, name string, field string, payload *FieldPayload) error {
	fieldPayloadString, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	patchPayloadTemplate :=
		`[{
        "op": "replace",
        "path": "/metadata/%s",
        "value": %s
    }]`
	patchPayload := fmt.Sprintf(patchPayloadTemplate, field, fieldPayloadString)

	_, err = client.Namespace(namespace).Patch(name, types.JSONPatchType, []byte(patchPayload), v1.UpdateOptions{})
	return err
}
