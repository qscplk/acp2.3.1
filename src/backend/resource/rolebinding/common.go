package rolebinding

import (
	"strings"

	"alauda.io/diablo/src/backend/resource/dataselect"
	rbacv1 "k8s.io/api/rbac/v1"
)

// RoleBindingCell role binding cell for diablo
type RoleBindingCell rbacv1.RoleBinding

// GetProperty used for filtering
func (self RoleBindingCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
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

func toCells(std []rbacv1.RoleBinding) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = RoleBindingCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []rbacv1.RoleBinding {
	std := make([]rbacv1.RoleBinding, len(cells))
	for i := range std {
		std[i] = rbacv1.RoleBinding(cells[i].(RoleBindingCell))
	}
	return std
}
