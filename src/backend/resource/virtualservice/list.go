package virtualservice

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"strings"
)

type VirtualServiceDetailList struct {
	ListMeta api.ListMeta                `json:"listMeta"`
	Items    []unstructured.Unstructured `json:"items"`
	Errors   []error                     `json:"errors"`
}

func GetVirtualServiceList(dyclient dynamic.NamespaceableResourceInterface, namespace string, dsQuery *dataselect.DataSelectQuery) (*VirtualServiceDetailList, error) {
	listOptions := common.ConvertToListOptions(dsQuery)
	obj, err := dyclient.Namespace(namespace).List(listOptions)
	if err != nil {
		return nil, err
	}
	items := obj.Items
	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(items), dsQuery)
	items = fromCells(cells)
	list := &VirtualServiceDetailList{
		ListMeta: api.ListMeta{
			TotalItems: filteredTotal,
		},
		Items:  items,
		Errors: []error{},
	}
	return list, nil
}

type VirtualServiceCell struct {
	obj *unstructured.Unstructured
}

func (cell VirtualServiceCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(cell.obj.GetName())
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(cell.obj.GetCreationTimestamp().Time)
	case dataselect.LabelProperty:
		if len(cell.obj.GetLabels()) > 0 {
			values := []string{}
			for k, v := range cell.obj.GetLabels() {
				values = append(values, k+":"+v)
			}
			return dataselect.StdComparableLabel(strings.Join(values, ","))
		}
		return dataselect.StdComparableLabel("")
	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func toCells(std []unstructured.Unstructured) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = VirtualServiceCell{obj: &std[i]}
	}
	return cells
}
func fromCells(cells []dataselect.DataCell) []unstructured.Unstructured {
	std := make([]unstructured.Unstructured, len(cells))
	for i := range std {
		std[i] = *cells[i].(VirtualServiceCell).obj
	}
	return std
}
