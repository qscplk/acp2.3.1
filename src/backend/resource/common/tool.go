package common

import (
	"encoding/json"
	"errors"

	"alauda.io/diablo/src/backend/api"
	"github.com/satori/go.uuid"
	"github.com/spf13/viper"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

func GetLocalBaseDomain() string {
	if viper.GetString("LABEL_BASE_DOMAIN") != "" {
		return viper.GetString("LABEL_BASE_DOMAIN")
	}
	return "alauda.io"
}

func ConvertResourcesToUnstructuredList(resources []interface{}) ([]*unstructured.Unstructured, error) {
	resourceList := make([]*unstructured.Unstructured, 0)
	if resources == nil && len(resources) == 0 {
		return resourceList, nil
	}

	for _, r := range resources {
		if r != nil {
			value, err := ConvertResourceToUnstructured(r)
			if err != nil {
				return resourceList, nil
			}
			resourceList = append(resourceList, value)
		}
	}
	return resourceList, nil
}

// ConvertResourceToUnstructured func
func ConvertResourceToUnstructured(resource interface{}) (*unstructured.Unstructured, error) {
	unstr := &unstructured.Unstructured{}
	data, err := json.Marshal(resource)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(data, unstr)
	if err != nil {
		return nil, err
	}
	return unstr, nil
}

func GetKeyOfUnstructured(unstr *unstructured.Unstructured) string {
	return unstr.GetKind() + unstr.GetName()
}

func GenKeyOfUnstructured(kind, name string) string {
	return kind + name
}

type ChangeListCollection struct {
	CreateList []unstructured.Unstructured `json:"createList"`
	DeleteList []unstructured.Unstructured `json:"deleteList"`
	UpdateList []UpdateUnstrResource       `json:"updateList"`
}

type UpdateUnstrResource struct {
	Old unstructured.Unstructured `json:"old"`
	New unstructured.Unstructured `json:"new"`
}

func CovertToResourceMap(resources []unstructured.Unstructured) map[string]unstructured.Unstructured {
	resourceMap := make(map[string]unstructured.Unstructured)
	for _, r := range resources {
		resourceMap[GetKeyOfUnstructured(&r)] = r
	}
	return resourceMap
}

func CombineResourceList(oldResourceList []unstructured.Unstructured, newResourceList []unstructured.Unstructured) []unstructured.Unstructured {
	oldMap := CovertToResourceMap(oldResourceList)
	combineList := make([]unstructured.Unstructured, 0, 2)

	for _, r := range newResourceList {
		key := GetKeyOfUnstructured(&r)
		old := oldMap[key]
		if old.GetName() == "" {
			combineList = append(combineList, r)
		} else {
			old = fulfillNewResourceData(old, r)
			combineList = append(combineList, old)
		}
	}
	return combineList
}

func fulfillNewResourceData(old unstructured.Unstructured, new unstructured.Unstructured) unstructured.Unstructured {

	switch old.GetKind() {
	case api.ResourceKindService:
		old = copySpecField(new, old, "spec", "ports")
		old = copySpecField(new, old, "metadata", "labels")
		old = copySpecField(new, old, "spec", "selector")
	case api.ResourceKindDeployment:
		old = new
	default:
		old = copySpecField(new, old, "spec")
	}
	return old
}

func copySpecField(source unstructured.Unstructured, dest unstructured.Unstructured, fields ...string) unstructured.Unstructured {
	sourceData, _, _ := unstructured.NestedFieldCopy(source.Object, fields...)
	unstructured.SetNestedField(dest.Object, sourceData, fields...)
	return dest
}

func AddSubList(resourceList []unstructured.Unstructured, subResourceList []unstructured.Unstructured) []unstructured.Unstructured {
	newResourceList := make([]unstructured.Unstructured, len(resourceList)+len(subResourceList))
	copy(newResourceList, resourceList)
	copy(newResourceList[len(resourceList):], subResourceList)
	return newResourceList
}

func RemoveSubList(resourceList []unstructured.Unstructured, subResourceList []unstructured.Unstructured) []unstructured.Unstructured {
	subMap := make(map[string]*unstructured.Unstructured)
	removedList := make([]unstructured.Unstructured, 0, 2)
	for _, r := range subResourceList {
		subMap[GetKeyOfUnstructured(&r)] = &r
	}

	for _, r := range resourceList {
		key := GetKeyOfUnstructured(&r)
		if subMap[key] == nil {
			removedList = append(removedList, r)
		}
	}
	return removedList
}

// ConvertResourceToRuntimeObject func
func ConvertResourceToRuntimeObject(resource interface{}) (runtime.Object, error) {
	mapInterfaceResult, ok := resource.(runtime.Object)
	if ok {
		return mapInterfaceResult, nil
	}
	return nil, errors.New("conver to runtime.object failed")
}

func GetUUID() (string, error) {
	data, err := uuid.NewV4()
	if err != nil {
		return "", err
	}
	return data.String(), nil
}
