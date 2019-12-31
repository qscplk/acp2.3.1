package pipeline

import (
	"strings"
	"time"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// The code below allows to perform complex data section on []api.Namespace

type PipelineCell devopsv1alpha1.Pipeline

func (self PipelineCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.StartedAtProperty:
		if self.Status.StartedAt != nil {
			return dataselect.StdComparableTime(self.Status.StartedAt.Time)
		}
		return dataselect.StdComparableTime(time.Time{})
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
	case dataselect.DisplayNameProperty:
		if len(self.ObjectMeta.Annotations) > 0 {
			if self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayName] != "" {
				return dataselect.StdLowerComparableString(self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayName])
			}
		}
		return dataselect.StdLowerComparableString(self.ObjectMeta.Name)
	case dataselect.LabelProperty:
		if len(self.ObjectMeta.Labels) > 0 {
			values := []string{}
			for k, v := range self.ObjectMeta.Labels {
				values = append(values, k+":"+v)
			}
			return dataselect.StdComparableLabel(strings.Join(values, ","))
		}
	case dataselect.MultiBranchCategoryProperty:
		if comparableVal, ok := dataselect.MapStdComparable(self.ObjectMeta.Annotations, common.AnnotationsKeyMultiBranchCategory); ok {
			return comparableVal
		}
	case dataselect.MultiBranchNameProperty:
		if comparableVal, ok := dataselect.MapStdComparable(self.ObjectMeta.Annotations, common.AnnotationsKeyMultiBranchName); ok {
			return comparableVal
		}
	case dataselect.PipelineStatusProperty:
		if self.Status.Jenkins != nil {
			return dataselect.StdComparableString(self.Status.Jenkins.Status)
		}
	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func toCells(std []devopsv1alpha1.Pipeline) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = PipelineCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.Pipeline {
	std := make([]devopsv1alpha1.Pipeline, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.Pipeline(cells[i].(PipelineCell))
	}
	return std
}
