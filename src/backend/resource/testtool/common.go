package testtool

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type testtoolCell devopsv1alpha1.TestTool

func (self testtoolCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
	case dataselect.DisplayNameProperty:
		name := self.ObjectMeta.Name
		if len(self.ObjectMeta.Annotations) != 0 && self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayName] != "" {
			name = self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayName]
		}
		return dataselect.StdLowerComparableString(name)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []devopsv1alpha1.TestTool) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = testtoolCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.TestTool {
	std := make([]devopsv1alpha1.TestTool, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.TestTool(cells[i].(testtoolCell))
	}
	return std
}
