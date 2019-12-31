package domainbinding

import (
	catalog "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
	catalogClient "catalog-controller/pkg/client/clientset/versioned"
	goErrors "errors"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// DomainBindingList struct
type DomainBindingList struct {
	ListMeta       api.ListMeta          `json:"listMeta"`
	DomainBindings []DomainBindingDetail `json:"domainBindings"`
	Errors         []error               `json:"errors"`
}

// GetDomainBindingList func
func GetDomainBindingList(client catalogClient.Interface, dsQuery *dataselect.DataSelectQuery) (dbl *DomainBindingList, e error) {
	db, err := client.CatalogControllerV1alpha1().Domains().List(api.ListEverything)
	if db == nil {
		return nil, goErrors.New("get nil domain list")
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	domainMap := make(map[string]*catalog.Domain)
	for _, item := range db.Items {
		domainMap[item.Name] = item.DeepCopy()
	}

	dbs, err := client.CatalogControllerV1alpha1().DomainBindings().List(api.ListEverything)
	nonCriticalErrors, criticalError = errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}
	domainBindings := make([]DomainBindingDetail, 0, len(dbs.Items))
	for _, item := range dbs.Items {
		dName := item.Spec.DomainRef.Name
		if domainMap[dName] == nil {
			continue
		}
		detail := generateDomainBindingDetail(domainMap[dName], &item)
		domainBindings = append(domainBindings, *detail)
	}
	domainBindingCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(domainBindings), dsQuery)
	items := fromCells(domainBindingCells)

	return &DomainBindingList{
		ListMeta:       api.ListMeta{TotalItems: filteredTotal},
		DomainBindings: items,
		Errors:         nonCriticalErrors,
	}, nil
}
