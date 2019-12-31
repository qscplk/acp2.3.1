package microservicesapplication

import (
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type MicroservicesApplicationCell Application

func (self MicroservicesApplicationCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.Name)
	case dataselect.StatusProperty:
		return dataselect.StdComparableString(self.Status)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []Application) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = MicroservicesApplicationCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []Application {
	std := make([]Application, len(cells))
	for i := range std {
		std[i] = Application(cells[i].(MicroservicesApplicationCell))
	}
	return std
}
