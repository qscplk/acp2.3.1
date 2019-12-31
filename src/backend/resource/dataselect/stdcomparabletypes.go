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

package dataselect

import (
	"strings"
	"time"
)

// ----------------------- Standard Comparable Types ------------------------
// These types specify how given value should be compared
// They all implement ComparableValueInterface
// You can convert basic types to these types to support auto sorting etc.
// If you cant find your type compare here you will have to implement it yourself :)

type StdComparableInt int

func (self StdComparableInt) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableInt)
	return intsCompare(int(self), int(other))
}

func (self StdComparableInt) Contains(otherV ComparableValue) bool {
	return self.Compare(otherV) == 0
}

type StdEqualString string

func (self StdEqualString) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(self), string(other))
}

func (self StdEqualString) Contains(otherV ComparableValue) bool {
	return self.Compare(otherV) == 0
}

type StdComparableString string

func (self StdComparableString) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(self), string(other))
}

func (self StdComparableString) Contains(otherV ComparableValue) bool {
	other := otherV.(StdComparableString)
	return strings.EqualFold(string(self), string(other))
}

func StdLowerComparableString(val string) StdComparableString {
	return StdComparableString(strings.ToLower(val))
}

type StdCaseInSensitiveComparableString string

func (self StdCaseInSensitiveComparableString) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(strings.ToLower(string(self)), strings.ToLower(string(other)))
}

func (self StdCaseInSensitiveComparableString) Contains(otherV ComparableValue) bool {
	other := otherV.(StdComparableString)
	return strings.Contains(strings.ToLower(string(self)), strings.ToLower(string(other)))
}

// StdComparableRFC3339Timestamp takes RFC3339 Timestamp strings and compares them as TIMES. In case of time parsing error compares values as strings.
type StdComparableRFC3339Timestamp string

func (self StdComparableRFC3339Timestamp) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableRFC3339Timestamp)
	// try to compare as timestamp (earlier = smaller)
	selfTime, err1 := time.Parse(time.RFC3339, string(self))
	otherTime, err2 := time.Parse(time.RFC3339, string(other))

	if err1 != nil || err2 != nil {
		// in case of timestamp parsing failure just compare as strings
		return strings.Compare(string(self), string(other))
	} else {
		return ints64Compare(selfTime.Unix(), otherTime.Unix())
	}
}

func (self StdComparableRFC3339Timestamp) Contains(otherV ComparableValue) bool {
	return self.Compare(otherV) == 0
}

type StdComparableTime time.Time

func (self StdComparableTime) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableTime)
	return ints64Compare(time.Time(self).Unix(), time.Time(other).Unix())
}

func (self StdComparableTime) Contains(otherV ComparableValue) bool {
	return self.Compare(otherV) == 0
}

type StdExactString string

func (self StdExactString) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(self), string(other))
}

func (self StdExactString) Contains(otherV ComparableValue) bool {
	other := otherV.(StdComparableString)
	return string(self) == string(other)
}

// Int comparison functions. Similar to strings.Compare.
func intsCompare(a, b int) int {
	if a > b {
		return 1
	} else if a == b {
		return 0
	}
	return -1
}

func ints64Compare(a, b int64) int {
	if a > b {
		return 1
	} else if a == b {
		return 0
	}
	return -1
}

type StdComparableLabel string

func (self StdComparableLabel) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(self), string(other))
}

func (self StdComparableLabel) Contains(otherV ComparableValue) bool {
	other := string(otherV.(StdComparableString))
	split := strings.Split(string(self), ",")
	if len(split) == 0 {
		return false
	}
	for _, s := range split {
		if s == other {
			return true
		}
	}
	return false
	// return strings.Contains(string(self), string(other))
}

type StdComparableStringIn string

func (self StdComparableStringIn) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(self), string(other))
}

func (self StdComparableStringIn) Contains(otherV ComparableValue) bool {
	cur := string(self)
	other := otherV.(StdComparableString)
	split := strings.Split(string(other), ":")
	if len(split) == 0 {
		return true
	}
	for _, s := range split {
		if s == cur {
			return true
		}
	}
	return false
}
