package domain

import (
	catalogClient "catalog-controller/pkg/client/clientset/versioned"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// DomainBindingList struct
type DomainList struct {
	ListMeta api.ListMeta   `json:"listMeta"`
	Domains  []DomainDetail `json:"domains"`
}

// GetDomainBindingList func
func GetDomainList(client catalogClient.Interface, dsQuery *dataselect.DataSelectQuery) (dbl *DomainList, e error) {
	db, err := client.CatalogControllerV1alpha1().Domains().List(api.ListEverything)
	if err != nil {
		return nil, err
	}

	domains := make([]DomainDetail, 0, len(db.Items))

	for _, item := range db.Items {
		detail := generateDomainDetail(&item)
		domains = append(domains, *detail)
	}

	domainCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(domains), dsQuery)
	items := fromCells(domainCells)

	return &DomainList{
		ListMeta: api.ListMeta{TotalItems: filteredTotal},
		Domains:  items,
	}, nil
}
