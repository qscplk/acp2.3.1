package other

import (
	"fmt"
	"sort"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/client-go/kubernetes"
)

var KindToName = map[string]string{}

type FieldPayload map[string]string

const (
	NamespacedScope = "namespaced"
	ClusteredScope  = "clustered"
)

type ResourceList struct {
	ListMeta  api.ListMeta    `json:"listMeta"`
	Resources []*ResourceMeta `json:"resources"`
	Errors    []error         `json:"errors"`
}

type ResourceMeta struct {
	ObjectMeta api.ObjectMeta   `json:"objectMeta"`
	TypeMeta   ResourceTypeMeta `json:"typeMeta"`
	Scope      string           `json:"scope"`
}

type ResourceMetaList []*ResourceMeta

func (rl ResourceMetaList) Len() int {
	return len(rl)
}

func (rl ResourceMetaList) Swap(i, j int) {
	rl[i], rl[j] = rl[j], rl[i]
}

// uid first, then groupversion length, then groupversion dict reverse order
func (rl ResourceMetaList) Less(i, j int) bool {
	if rl[i].ObjectMeta.Uid != rl[j].ObjectMeta.Uid {
		return rl[i].ObjectMeta.Uid < rl[j].ObjectMeta.Uid
	}

	if len(rl[i].TypeMeta.GroupVersion) != len(rl[j].TypeMeta.GroupVersion) {
		return len(rl[i].TypeMeta.GroupVersion) < len(rl[j].TypeMeta.GroupVersion)
	}

	return rl[i].TypeMeta.GroupVersion > rl[j].TypeMeta.GroupVersion
}

func (rl ResourceMetaList) unique() ResourceMetaList {
	sort.Sort(&rl)
	result := ResourceMetaList{}
	for i, r := range rl {
		if i == 0 || r.ObjectMeta.Uid == "" {
			result = append(result, r)
		} else {
			if r.ObjectMeta.Uid == rl[i-1].ObjectMeta.Uid {
				continue
			} else {
				result = append(result, r)
			}
		}
	}
	return result
}

type ResourceTypeMeta struct {
	Name         string `json:"-"`
	Kind         string `json:"kind"`
	GroupVersion string `json:"groupVersion"`
}

func (r *ResourceMeta) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(r.ObjectMeta.Name)
	case dataselect.NameLengthProperty:
		return dataselect.StdComparableInt(len(r.ObjectMeta.Name))
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(r.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(r.ObjectMeta.Namespace)
	case dataselect.ScopeProperty:
		return dataselect.StdComparableString(r.Scope)
	case dataselect.KindProperty:
		return dataselect.StdComparableString(r.TypeMeta.Kind)
	default:
		return nil
	}
}

func (r *ResourceMeta) setScope() {
	if r.ObjectMeta.Namespace == "" {
		r.Scope = ClusteredScope
	} else {
		r.Scope = NamespacedScope
	}
}

func toCells(std []*ResourceMeta) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = std[i]
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []*ResourceMeta {
	std := make([]*ResourceMeta, len(cells))
	for i := range std {
		std[i] = cells[i].(*ResourceMeta)
	}
	return std
}

func GetKindName(client kubernetes.Interface, kind string) (string, error) {
	if name, ok := KindToName[kind]; ok {
		return name, nil
	}

	if _, err := GetCanListResource(client); err != nil {
		return "", err
	}

	if name, ok := KindToName[kind]; ok {
		return name, nil
	}
	return "", fmt.Errorf("kind %s not find in kubernetes server", kind)
}
