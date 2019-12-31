package policy

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

type PolicyList struct {
	ListMeta api.ListMeta                `json:"listMeta"`
	Items    []unstructured.Unstructured `json:"items"`
	Errors   []error                     `json:"errors"`
}

func GetPolicyList(dyclient dynamic.NamespaceableResourceInterface, namespace string, dsQuery *dataselect.DataSelectQuery) (*PolicyList, error) {
	obj, err := dyclient.Namespace(namespace).List(api.ListEverything)
	if err != nil {
		return nil, err
	}
	items := obj.Items
	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(items), dsQuery)
	items = fromCells(cells)
	list := &PolicyList{
		ListMeta: api.ListMeta{
			TotalItems: filteredTotal,
		},
		Items:  items,
		Errors: []error{},
	}
	return list, nil
}

type PolicyCell struct {
	obj *unstructured.Unstructured
}

func (cell PolicyCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(cell.obj.GetName())
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(cell.obj.GetCreationTimestamp().Time)
	default:
		return nil
	}
}

func toCells(std []unstructured.Unstructured) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = PolicyCell{obj: &std[i]}
	}
	return cells
}
func fromCells(cells []dataselect.DataCell) []unstructured.Unstructured {
	std := make([]unstructured.Unstructured, len(cells))
	for i := range std {
		std[i] = *cells[i].(PolicyCell).obj
	}
	return std
}
