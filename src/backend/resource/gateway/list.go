package gateway

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

type GatewayList struct {
	ListMeta api.ListMeta                `json:"listMeta"`
	Items    []unstructured.Unstructured `json:"items"`
	Errors   []error                     `json:"errors"`
}

func GetGatewayList(dyclient dynamic.NamespaceableResourceInterface, namespace string, dsQuery *dataselect.DataSelectQuery) (*GatewayList, error) {
	obj, err := dyclient.Namespace(namespace).List(api.ListEverything)
	if err != nil {
		return nil, err
	}
	items := obj.Items
	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(items), dsQuery)
	items = fromCells(cells)
	list := &GatewayList{
		ListMeta: api.ListMeta{
			TotalItems: filteredTotal,
		},
		Items:  items,
		Errors: []error{},
	}
	return list, nil
}

type GatewayCell struct {
	obj *unstructured.Unstructured
}

func (cell GatewayCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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
		cells[i] = GatewayCell{obj: &std[i]}
	}
	return cells
}
func fromCells(cells []dataselect.DataCell) []unstructured.Unstructured {
	std := make([]unstructured.Unstructured, len(cells))
	for i := range std {
		std[i] = *cells[i].(GatewayCell).obj
	}
	return std
}
