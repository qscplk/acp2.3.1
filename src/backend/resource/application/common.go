package application

import (
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type ApplicationCell Application

func (self ApplicationCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.ExactNameProperty:
		return dataselect.StdExactString(self.ObjectMeta.Name)
	default:
	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func (self ApplicationCell) GetResourceSelector() *metricapi.ResourceSelector {
	return &metricapi.ResourceSelector{
		Namespace:    self.ObjectMeta.Namespace,
		ResourceName: self.ObjectMeta.Name,
	}
}

func toCells(std []Application) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = ApplicationCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []Application {
	std := make([]Application, len(cells))
	for i := range std {
		std[i] = Application(cells[i].(ApplicationCell))
	}
	return std
}
