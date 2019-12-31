package domain

import (
	"alauda.io/diablo/src/backend/api"

	catalog "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
)

const (
	APIVersion = "catalog.alauda.io/v1alpha1"
)

type DomainDetail struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	Name       string         `json:"name,omitempty"`
	IsPan      bool           `json:"isPan"`
	Value      string         `json:"value"`
}

func generateDomainDetail(dr *catalog.Domain) (dbd *DomainDetail) {
	return &DomainDetail{
		ObjectMeta: api.NewObjectMeta(dr.ObjectMeta),
		Name:       dr.Name,
		IsPan:      dr.Spec.IsPan,
		Value:      dr.Spec.Value,
	}
}
