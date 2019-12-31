// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package statefulset

import (
	"strings"

	"alauda.io/diablo/src/backend/api"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	apps "k8s.io/api/apps/v1"
)

// The code below allows to perform complex data section on []apps.StatefulSet

type StatefulSetCell apps.StatefulSet

func (self StatefulSetCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
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
	default:

	}
	// if name is not supported then just return a constant dummy value, sort will have no effect.
	return nil
}

func (self StatefulSetCell) GetResourceSelector() *metricapi.ResourceSelector {
	return &metricapi.ResourceSelector{
		Namespace:    self.ObjectMeta.Namespace,
		ResourceType: api.ResourceKindStatefulSet,
		ResourceName: self.ObjectMeta.Name,
		UID:          self.UID,
	}
}

func toCells(std []apps.StatefulSet) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = StatefulSetCell(std[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []apps.StatefulSet {
	std := make([]apps.StatefulSet, len(cells))
	for i := range std {
		std[i] = apps.StatefulSet(cells[i].(StatefulSetCell))
	}
	return std
}
