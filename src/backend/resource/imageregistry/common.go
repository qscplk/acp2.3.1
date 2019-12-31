package imageregistry

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type imageRegistryCell devopsv1alpha1.ImageRegistry

func (self imageRegistryCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
	case dataselect.DisplayNameProperty:
		if len(self.ObjectMeta.Annotations) > 0 {
			if self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayName] != "" {
				return dataselect.StdLowerComparableString(self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayName])
			}
		}
		return dataselect.StdLowerComparableString(self.ObjectMeta.Name)
	default:
		return nil
	}
}

func toCells(std []devopsv1alpha1.ImageRegistry) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = imageRegistryCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.ImageRegistry {
	std := make([]devopsv1alpha1.ImageRegistry, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.ImageRegistry(cells[i].(imageRegistryCell))
	}
	return std
}
