package handler

import (
	"testing"
	"time"
)

func TestGetRecentPeriodTime(t *testing.T) {
	type Expected struct {
		startTime time.Time
		endTime   time.Time
		err       error
	}

	type Table struct {
		name     string
		input    string
		expected Expected
	}

	tests := []Table{
		{
			name:  "empty input",
			input: "",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// todo
		})
	}
}
