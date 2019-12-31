package codereposervice

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type codeRepoServiceCell devopsv1alpha1.CodeRepoService

func (self codeRepoServiceCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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

func toCells(std []devopsv1alpha1.CodeRepoService) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = codeRepoServiceCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.CodeRepoService {
	std := make([]devopsv1alpha1.CodeRepoService, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.CodeRepoService(cells[i].(codeRepoServiceCell))
	}
	return std
}
