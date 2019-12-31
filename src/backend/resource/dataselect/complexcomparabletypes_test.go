package dataselect

import (
	"testing"
)

func TestComparableJSONIn(t *testing.T) {
	origin := ComparableJSONIn(`
	[{
		"zh-CN": "zh-1",
		"en": "en-1"
	}, {
		"zh-CN": "zh-2",
		"en": "en-2"
	}]
	`)

	var ok bool

	case1 := StdComparableString("en-1")
	ok = origin.Contains(case1)
	if !ok {
		t.Errorf("should contains %s", case1)
	}

	case2 := StdComparableString("en-1:en-2")
	ok = origin.Contains(case2)
	if !ok {
		t.Errorf("should contains %s", case2)
	}

	case3 := StdComparableString("en-1:en-3")
	ok = origin.Contains(case3)
	if ok {
		t.Errorf("should not contains %s", case3)
	}

	// back compatible test
	case4 := StdComparableString("en-1")
	ok = ComparableJSONIn("en-1").Contains(case4)
	if !ok {
		t.Errorf("shoud contains %s", case4)
	}

	ok = ComparableJSONIn("en-2").Contains(case4)
	if ok {
		t.Errorf("shoud not contains %s", case4)
	}
}
