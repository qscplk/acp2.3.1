package rolebinding

import (
	"log"

	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// DeleteRoleBinding delete rolebinding
func DeleteRoleBinding(client kubernetes.Interface, namespace, name string) (err error) {
	err = client.RbacV1().RoleBindings(namespace).Delete(name, &metaV1.DeleteOptions{})
	log.Println("Delete rolebinding namespace", namespace, "name", name, "err", err)
	return
}
