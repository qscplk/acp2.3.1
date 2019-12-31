package domainbinding

import (
	catalog "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
	catalogClient "catalog-controller/pkg/client/clientset/versioned"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	APIVersion = "catalog.alauda.io/v1alpha1"
)

type DomainBindingSpec struct {
	Domain   Domain               `json:"domain"`
	IsPublic bool                 `json:"isPublic"`
	Projects []catalog.ProjectRef `json:"projects,omitempty"`
}

type Domain struct {
	Name  string `json:"name,omitempty"`
	IsPan bool   `json:"isPan"`
	Value string `json:"value"`
}

type DomainBindingDetail struct {
	ObjectMeta api.ObjectMeta       `json:"objectMeta"`
	Domain     Domain               `json:"domain"`
	IsPublic   bool                 `json:"isPublic"`
	Projects   []catalog.ProjectRef `json:"projects"`
}

func CreateDomainBinding(c catalogClient.Interface, r *DomainBindingSpec) (dbd *DomainBindingDetail, err error) {
	id, err := common.GetUUID()
	if err != nil {
		return nil, err
	}
	dName := "domain-" + id
	d := &catalog.Domain{
		ObjectMeta: metaV1.ObjectMeta{
			Name: dName,
		},
		TypeMeta: generateDomainTypeMeta(),
		Spec: catalog.DomainSpec{
			IsPan: r.Domain.IsPan,
			Value: r.Domain.Value,
		},
	}
	dr, err := c.CatalogControllerV1alpha1().Domains().Create(d)
	if err != nil {
		return nil, err
	}
	dbName := "domainbinding-" + id
	db := &catalog.DomainBinding{
		ObjectMeta: metaV1.ObjectMeta{
			Name: dbName,
		},
		TypeMeta: generateDomainBindingTypeMeta(),
		Spec: catalog.DomainBindingSpec{
			DomainRef:   catalog.DomainRef{Name: dName},
			IsPublic:    r.IsPublic,
			ProjectRefs: r.Projects,
		},
	}
	dbr, err := c.CatalogControllerV1alpha1().DomainBindings().Create(db)
	if err != nil {
		return nil, err
	}
	dbd = &DomainBindingDetail{
		ObjectMeta: api.NewObjectMeta(dbr.ObjectMeta),
		Domain: Domain{
			Name:  dr.Name,
			IsPan: dr.Spec.IsPan,
			Value: dr.Spec.Value,
		},
		IsPublic: dbr.Spec.IsPublic,
		Projects: dbr.Spec.ProjectRefs,
	}
	return dbd, nil
}

func GetDomain(c catalogClient.Interface, name string) (*Domain, error) {
	dr, err := c.CatalogControllerV1alpha1().Domains().Get(name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return &Domain{
		Name:  dr.Name,
		IsPan: dr.Spec.IsPan,
		Value: dr.Spec.Value,
	}, nil
}

func GetDomainBindingDetail(c catalogClient.Interface, name string) (dbd *DomainBindingDetail, err error) {
	dbr, err := c.CatalogControllerV1alpha1().DomainBindings().Get(name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}
	dr, err := c.CatalogControllerV1alpha1().Domains().Get(dbr.Spec.DomainRef.Name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}
	dbd = generateDomainBindingDetail(dr, dbr)
	return dbd, nil
}

func DeleteDomainBinding(c catalogClient.Interface, name string) error {
	dbr, err := c.CatalogControllerV1alpha1().DomainBindings().Get(name, metaV1.GetOptions{})
	if err != nil {
		return err
	}
	err = c.CatalogControllerV1alpha1().Domains().Delete(dbr.Spec.DomainRef.Name, &metaV1.DeleteOptions{})
	if err != nil {
		return err
	}
	err = c.CatalogControllerV1alpha1().DomainBindings().Delete(name, &metaV1.DeleteOptions{})
	return err
}

func UpdateDomainBinding(c catalogClient.Interface, name string, dbs *DomainBindingSpec) (dbd *DomainBindingDetail, err error) {
	dbr, err := c.CatalogControllerV1alpha1().DomainBindings().Get(name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}
	dr, err := c.CatalogControllerV1alpha1().Domains().Get(dbr.Spec.DomainRef.Name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}
	dr.Spec.IsPan = dbs.Domain.IsPan
	dr.Spec.Value = dbs.Domain.Value
	dr.TypeMeta = generateDomainTypeMeta()
	dr, err = c.CatalogControllerV1alpha1().Domains().Update(dr)
	if err != nil {
		return nil, err
	}
	dbr.Spec.IsPublic = dbs.IsPublic
	dbr.Spec.ProjectRefs = dbs.Projects
	dbr.TypeMeta = generateDomainBindingTypeMeta()
	dbr, err = c.CatalogControllerV1alpha1().DomainBindings().Update(dbr)
	if err != nil {
		return nil, err
	}
	return generateDomainBindingDetail(dr, dbr), nil
}

func generateDomainBindingDetail(dr *catalog.Domain, dbr *catalog.DomainBinding) (dbd *DomainBindingDetail) {
	return &DomainBindingDetail{
		ObjectMeta: api.NewObjectMeta(dbr.ObjectMeta),
		Domain: Domain{
			Name:  dr.Name,
			IsPan: dr.Spec.IsPan,
			Value: dr.Spec.Value,
		},
		IsPublic: dbr.Spec.IsPublic,
		Projects: dbr.Spec.ProjectRefs,
	}
}

func generateDomainBindingTypeMeta() metaV1.TypeMeta {
	return metaV1.TypeMeta{
		Kind:       api.ResourceKindDomainBinding,
		APIVersion: APIVersion,
	}
}

func generateDomainTypeMeta() metaV1.TypeMeta {
	return metaV1.TypeMeta{
		Kind:       api.ResourceKindDomain,
		APIVersion: APIVersion,
	}
}
