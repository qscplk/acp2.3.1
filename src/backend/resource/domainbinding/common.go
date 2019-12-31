package domainbinding

import (
	"strings"

	"alauda.io/diablo/src/backend/resource/dataselect"
)

type CompAlwaysOK string

func (c CompAlwaysOK) Compare(other dataselect.ComparableValue) int {
	return 0
}

func (c CompAlwaysOK) Contains(other dataselect.ComparableValue) bool {
	return true
}

type StdComparableProjectIn string

func (self StdComparableProjectIn) Compare(otherV dataselect.ComparableValue) int {
	other := otherV.(dataselect.StdComparableString)
	return strings.Compare(string(self), string(other))
}

func (self StdComparableProjectIn) Contains(otherV dataselect.ComparableValue) bool {
	cur := string(self)
	other := string(otherV.(dataselect.StdComparableString))
	split := strings.Split(string(cur), ":")
	if len(split) == 0 {
		return true
	}
	for _, s := range split {
		if s == other {
			return true
		}
	}
	return false
}

type DomainBindingCell DomainBindingDetail

func (self DomainBindingCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.DomainProperty:
		return dataselect.StdComparableString(self.Domain.Value)
	case dataselect.ProjectProperty:
		if self.IsPublic {
			return CompAlwaysOK("")
		}
		values := []string{}
		for _, v := range self.Projects {
			values = append(values, v.Name)
		}
		return StdComparableProjectIn(strings.Join(values, ":"))
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

func toCells(std []DomainBindingDetail) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = DomainBindingCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []DomainBindingDetail {
	std := make([]DomainBindingDetail, len(cells))
	for i := range std {
		std[i] = DomainBindingDetail(cells[i].(DomainBindingCell))
	}
	return std
}
