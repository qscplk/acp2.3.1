package microservicesconfiguration

import (
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type MicroservicesConfigurationCell Configuration

func (self MicroservicesConfigurationCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.Name)
	case dataselect.MicroservicesConfigLabelProperty:
		return dataselect.StdComparableString(self.Label)
	case dataselect.MicroservicesConfigProfileProperty:
		return dataselect.StdComparableString(self.Profile)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []Configuration) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = MicroservicesConfigurationCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []Configuration {
	std := make([]Configuration, len(cells))
	for i := range std {
		std[i] = Configuration(cells[i].(MicroservicesConfigurationCell))
	}
	return std
}
