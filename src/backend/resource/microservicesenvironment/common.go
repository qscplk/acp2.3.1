package microservicesenvironment

import (
	asf "alauda.io/diablo/src/backend/client/asf"
	"alauda.io/diablo/src/backend/resource/common"
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

type MicroservicesEnvironmentCell asf.MicroservicesEnvironment

func (self MicroservicesEnvironmentCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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

func toCells(std []asf.MicroservicesEnvironment) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = MicroservicesEnvironmentCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []asf.MicroservicesEnvironment {
	std := make([]asf.MicroservicesEnvironment, len(cells))
	for i := range std {
		std[i] = asf.MicroservicesEnvironment(cells[i].(MicroservicesEnvironmentCell))
	}
	return std
}
