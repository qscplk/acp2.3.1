package artifactregistrybinding

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type artifactRegistryBindingCell devopsv1alpha1.ArtifactRegistryBinding

func (self artifactRegistryBindingCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []devopsv1alpha1.ArtifactRegistryBinding) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = artifactRegistryBindingCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.ArtifactRegistryBinding {
	std := make([]devopsv1alpha1.ArtifactRegistryBinding, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.ArtifactRegistryBinding(cells[i].(artifactRegistryBindingCell))
	}
	return std
}
