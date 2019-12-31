package domain

import (
	"strings"

	"alauda.io/diablo/src/backend/resource/dataselect"
)

type DomainCell DomainDetail

func (self DomainCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.DomainProperty:
		return dataselect.StdComparableString(self.Value)
	case dataselect.LabelProperty:
		if len(self.ObjectMeta.Labels) > 0 {
			values := []string{}
			for k, v := range self.ObjectMeta.Labels {
				values = append(values, k+":"+v)
			}
			return dataselect.StdComparableLabel(strings.Join(values, ","))
		}
	default:
	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func toCells(std []DomainDetail) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = DomainCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []DomainDetail {
	std := make([]DomainDetail, len(cells))
	for i := range std {
		std[i] = DomainDetail(cells[i].(DomainCell))
	}
	return std
}
