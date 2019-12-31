package pipelineconfig

import (
	"strings"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// The code below allows to perform complex data section on []api.Namespace

type PipelineConfigCell devopsv1alpha1.PipelineConfig

func (self PipelineConfigCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
	case dataselect.CodeRepositoryProperty:
		if self.Spec.Source.CodeRepository == nil {
			return nil
		}
		return dataselect.StdComparableString(self.Spec.Source.CodeRepository.Name)
	case dataselect.JenkinsBindingProperty:
		return dataselect.StdEqualString(self.Spec.JenkinsBinding.Name)
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
	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func toCells(std []devopsv1alpha1.PipelineConfig) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = PipelineConfigCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.PipelineConfig {
	std := make([]devopsv1alpha1.PipelineConfig, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.PipelineConfig(cells[i].(PipelineConfigCell))
	}
	return std
}

// ToPipelineConfigList converts a list of resource to a PipelineConfig slice
func ToPipelineConfigList(res []common.Resource) (list []PipelineConfig) {
	var (
		ok     bool
		config PipelineConfig
	)
	list = make([]PipelineConfig, 0, len(res))
	for _, r := range res {
		if config, ok = r.(PipelineConfig); ok {
			list = append(list, config)
		}
	}
	return
}
