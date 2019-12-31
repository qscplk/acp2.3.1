package codequalitytool

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type codeQualityToolCell devopsv1alpha1.CodeQualityTool

func (self codeQualityToolCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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

func toCells(std []devopsv1alpha1.CodeQualityTool) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = codeQualityToolCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.CodeQualityTool {
	std := make([]devopsv1alpha1.CodeQualityTool, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.CodeQualityTool(cells[i].(codeQualityToolCell))
	}
	return std
}
