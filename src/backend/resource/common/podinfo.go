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

package common

import (
	api "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PodInfo represents aggregate information about controller's pods.
type PodInfo struct {
	// Number of pods that are created.
	Current int32 `json:"current"`

	// Number of pods that are desired.
	Desired *int32 `json:"desired,omitempty"`

	// Number of pods that are currently running.
	Running int32 `json:"running"`

	// Number of pods that are currently waiting.
	Pending int32 `json:"pending"`

	// Number of pods that are failed.
	Failed int32 `json:"failed"`

	// Number of pods that are succeeded.
	Succeeded int32 `json:"succeeded"`

	// Unique warning messages related to pods in this resource.
	Warnings []Event `json:"warnings"`
}

// GetPodInfo returns aggregate information about a group of pods.
func GetPodInfo(current int32, desired *int32, pods []api.Pod) PodInfo {
	result := PodInfo{
		Current:  current,
		Desired:  desired,
		Warnings: make([]Event, 0),
	}

	for _, pod := range pods {
		switch pod.Status.Phase {
		case api.PodRunning:
			result.Running++
		case api.PodPending:
			result.Pending++
		case api.PodFailed:
			result.Failed++
		case api.PodSucceeded:
			result.Succeeded++
		}
	}

	return result
}

type PodInfoItem struct {
	Name     string  `json:"name"`
	Status   string  `json:"status"`
	Warnings []Event `json:"warnings"`
}

type PodControllerInfo struct {
	Warnings []Event       `json:"warnings"`
	Pods     []PodInfoItem `json:"pods"`

	// Number of pods that are created.
	Current int32 `json:"current"`

	// Number of pods that are desired.
	Desired *int32 `json:"desired,omitempty"`
}

func getPodInfoItem(pod api.Pod, events []api.Event) PodInfoItem {
	warnings := make([]Event, 0)
	for _, event := range events {
		if event.InvolvedObject.UID == pod.UID && event.Type == api.EventTypeWarning {
			warnings = append(warnings, Event{
				Message: event.Message,
				Reason:  event.Reason,
				Type:    event.Type,
			})
		}
	}

	status := pod.Status.Phase
	if pod.Status.Phase == api.PodRunning {
		for _, cs := range pod.Status.ContainerStatuses {
			if !cs.Ready {
				status = api.PodPending
				break
			}
		}
	}

	if status == api.PodPending && len(warnings) != 0 {
		status = api.PodFailed
	}

	return PodInfoItem{Name: pod.Name, Status: string(status), Warnings: warnings}
}

func GetPodControllerInfo(current int32, desired *int32, controller metav1.Object, pods []api.Pod, events []api.Event) PodControllerInfo {
	result := PodControllerInfo{
		Current:  current,
		Desired:  desired,
		Warnings: make([]Event, 0),
		Pods:     make([]PodInfoItem, 0, len(pods)),
	}

	for _, event := range events {
		if event.InvolvedObject.UID == controller.GetUID() && event.Type == api.EventTypeWarning {
			result.Warnings = append(result.Warnings, Event{
				Message: event.Message,
				Reason:  event.Reason,
				Type:    event.Type,
			})
		}
	}

	for _, pod := range pods {
		result.Pods = append(result.Pods, getPodInfoItem(pod, events))
	}

	return result
}
