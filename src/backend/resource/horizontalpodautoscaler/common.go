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

package horizontalpodautoscaler

import (
	autoscaling "k8s.io/api/autoscaling/v2beta1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// Simple mapping of an autoscaling.CrossVersionObjectReference
type ScaleTargetRef struct {
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	APIVersion string `json:"apiVersion"`
}

func setTypeMeta(cm *autoscaling.HorizontalPodAutoscaler) {
	cm.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "autoscaling",
		Version: "v2beta1",
		Kind:    "HorizontalPodAutoscaler",
	})
}
