package common

import (
	"testing"
)

func TestGetControllerStatus(t *testing.T) {
	var desired int32
	desired = 2

	var data = []struct {
		input  *PodControllerInfo
		output ControllerStatus
	}{
		{input: &PodControllerInfo{
			Current: 1,
			Desired: &desired,
			Pods:    []PodInfoItem{},
		}, output: ControllerPending,
		},
		{
			input: &PodControllerInfo{
				Current: 2,
				Desired: &desired,
				Pods:    []PodInfoItem{},
			}, output: ControllerSucceeded,
		},
	}

	for _, tt := range data {
		t.Run(string(tt.output), func(t *testing.T) {
			result := GetControllerStatus(tt.input)
			if result != tt.output {
				t.Errorf("got %q, want %q", result, tt.output)
			}
		})
	}
}
