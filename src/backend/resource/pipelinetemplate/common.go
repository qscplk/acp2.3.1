package pipelinetemplate

import (
	"strings"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

type PipelineTemplateCell devopsv1alpha1.PipelineTemplate

func (self PipelineTemplateCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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
	case dataselect.DisplayEnNameProperty:
		if len(self.ObjectMeta.Annotations) > 0 {
			if self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayNameEn] != "" {
				return dataselect.StdCaseInSensitiveComparableString(self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayNameEn])
			}
		}
		return dataselect.StdCaseInSensitiveComparableString(self.ObjectMeta.Name)
	case dataselect.DisplayZhNameProperty:
		if len(self.ObjectMeta.Annotations) > 0 {
			if self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayNameZh] != "" {
				return dataselect.StdCaseInSensitiveComparableString(self.ObjectMeta.Annotations[common.AnnotationsKeyDisplayNameZh])
			}
		}
		return dataselect.StdCaseInSensitiveComparableString(self.ObjectMeta.Name)
	case dataselect.LabelProperty:
		if len(self.ObjectMeta.Labels) > 0 {
			values := []string{}
			for k, v := range self.ObjectMeta.Labels {
				values = append(values, k+":"+v)
			}
			return dataselect.StdComparableLabel(strings.Join(values, ","))
		}
	case dataselect.CategoryProperty:
		// it could have multi-categories as a json form
		var category string
		var ok bool
		if len(self.ObjectMeta.Annotations) > 0 {
			category, ok = self.ObjectMeta.Annotations[common.AnnotationsKeyCategories]
		}

		if !ok && len(self.ObjectMeta.Labels) > 0 {
			// for back compatible case
			category, ok = self.ObjectMeta.Labels[dataselect.CategoryProperty]
		}

		if category != "" {
			return dataselect.ComparableJSONIn(category)
		}
	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func toCells(std []devopsv1alpha1.PipelineTemplate) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = PipelineTemplateCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.PipelineTemplate {
	std := make([]devopsv1alpha1.PipelineTemplate, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.PipelineTemplate(cells[i].(PipelineTemplateCell))
	}
	return std
}
