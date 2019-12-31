package ingress

import (
	"fmt"

	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	// v1 "k8s.io/api/core/v1"
	v1beta1 "k8s.io/api/extensions/v1beta1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	client "k8s.io/client-go/kubernetes"
)

func setTypeMeta(cm *v1beta1.Ingress) {
	cm.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "extensions",
		Version: "v1beta1",
		Kind:    "Ingress",
	})
}

// GetOriginalList get original list from api
func GetOriginalList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (list *v1beta1.IngressList, err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	list, err = client.ExtensionsV1beta1().Ingresses(namespace).List(listOptions)
	if list != nil && list.Items != nil {
		for x, d := range list.Items {
			newD := d.DeepCopy()
			setTypeMeta(newD)
			list.Items[x] = *newD
		}
	}
	return
}

// DeleteOriginalList deletes a list using a query selector
func DeleteOriginalList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	err = client.ExtensionsV1beta1().Ingresses(namespace).DeleteCollection(nil, listOptions)
	return
}

// GetObjectList returns a slice of runtime.Object
func GetObjectList(list *v1beta1.IngressList) (res []runtime.Object) {
	if list == nil || len(list.Items) == 0 {
		res = []runtime.Object{}
		return
	}
	res = make([]runtime.Object, len(list.Items))
	for i, d := range list.Items {
		item := d
		res[i] = &item
	}
	return
}

func DeleteObject(client client.Interface, obj runtime.Object) (name string, err error) {
	if res, ok := obj.(*v1beta1.Ingress); ok {
		name = res.GetName()
		err = client.ExtensionsV1beta1().Ingresses(res.GetNamespace()).Delete(res.GetName(), nil)
	} else {
		err = fmt.Errorf("Ingress runtime is not a valid object type: %v", obj)
	}
	return
}
