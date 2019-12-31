package jenkinsbinding

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// NamespaceSpec is a specification of namespace to create.
// type NamespaceSpec struct {
// 	// Name of the namespace.
// 	Name string `json:"name"`
// }

// TODO: Change to support project
// CreateNamespace creates namespace based on given specification.
// func CreateNamespace(spec *NamespaceSpec, client kubernetes.Interface) error {
// 	log.Printf("Creating namespace %s", spec.Name)

// 	namespace := &api.Namespace{
// 		ObjectMeta: metaV1.ObjectMeta{
// 			Name: spec.Name,
// 		},
// 	}

// 	_, err := client.CoreV1().Namespaces().Create(namespace)
// 	return err
// }

// The code below allows to perform complex data section on []api.Namespace

type JenkinsBindingCell devopsv1alpha1.JenkinsBinding

func (self JenkinsBindingCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
	case dataselect.JenkinsProperty:
		return dataselect.StdLowerComparableString(self.Spec.Jenkins.Name)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}

func toCells(std []devopsv1alpha1.JenkinsBinding) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = JenkinsBindingCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []devopsv1alpha1.JenkinsBinding {
	std := make([]devopsv1alpha1.JenkinsBinding, len(cells))
	for i := range std {
		std[i] = devopsv1alpha1.JenkinsBinding(cells[i].(JenkinsBindingCell))
	}
	return std
}
