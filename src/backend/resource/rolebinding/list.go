package rolebinding

import (
	"log"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/client-go/kubernetes"
)

// RoleBindingList list of role bindings
type RoleBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	Items []rbacv1.RoleBinding `json:"items"`

	Errors []error `json:"errors"`
}

// GetRoleBindingsList fetches a list of rolebindings for a namespace
func GetRoleBindingsList(client kubernetes.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*RoleBindingList, error) {
	log.Println("Getting list of rolebinding for namespace", namespace.ToRequestParam())
	var (
		rolebindingCritical    error
		rolebindingNonCritical []error
	)
	bindings, err := client.RbacV1().RoleBindings(namespace.ToRequestParam()).List(api.ListEverything)
	rolebindingNonCritical, rolebindingCritical = errors.HandleError(err)
	if rolebindingCritical != nil {
		log.Println("error while listing rolebindings: ", rolebindingCritical)
		return nil, rolebindingCritical
	}
	return toRoleBindingList(bindings.Items, rolebindingNonCritical, dsQuery), nil

}

func toRoleBindingList(rolebindings []rbacv1.RoleBinding, nonCriticalERrors []error, dsQuery *dataselect.DataSelectQuery) *RoleBindingList {
	list := &RoleBindingList{
		Items:    make([]rbacv1.RoleBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(rolebindings)},
	}

	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(rolebindings), dsQuery)
	bindings := fromCells(cells)
	list.ListMeta.TotalItems = filteredTotal
	list.Errors = nonCriticalERrors
	list.Items = append(list.Items, bindings...)
	return list
}

// CreateRoleBinding create a role binding
func CreateRoleBinding(client kubernetes.Interface, spec *rbacv1.RoleBinding) (result *rbacv1.RoleBinding, err error) {
	namespace := spec.ObjectMeta.Namespace
	log.Println("Creating rolebinding namespace", namespace, "data", spec)
	result, err = client.RbacV1().RoleBindings(namespace).Create(spec)
	log.Println("Create rolebinding namespace", namespace, "result", spec, "err", err)
	return
}
