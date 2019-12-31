package dataselect

import (
	"encoding/json"
	"strings"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
)

// ComparableJSONIn type of json comparable
type ComparableJSONIn string

// Compare comparae two object
func (c ComparableJSONIn) Compare(otherV ComparableValue) int {
	other := otherV.(StdComparableString)
	return strings.Compare(string(c), string(other))
}

// Contains one array should in the json array
func (c ComparableJSONIn) Contains(otherV ComparableValue) bool {
	other := otherV.(StdComparableString)
	split := strings.Split(string(other), ":")
	cur := string(c)

	var categories []devopsv1alpha1.I18nName
	err := json.Unmarshal([]byte(cur), &categories)
	if err != nil {
		// back compatible
		categories = []devopsv1alpha1.I18nName{
			{
				En: cur,
			},
		}
	}

	count := 0
	for _, item := range split {
		for _, category := range categories {
			if item == category.En {
				count++
				break
			}
		}
	}

	return (count == len(split))
}
