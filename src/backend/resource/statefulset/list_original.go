package statefulset

import (
	"fmt"

	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	v1 "k8s.io/api/apps/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	client "k8s.io/client-go/kubernetes"
)

func setTypeMeta(cm *v1.StatefulSet) {
	cm.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "apps",
		Version: "v1",
		Kind:    "StatefulSet",
	})
}

// GetOriginalList get original list from api
func GetOriginalList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (list *v1.StatefulSetList, err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	list, err = client.AppsV1().StatefulSets(namespace).List(listOptions)
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
	err = client.AppsV1().StatefulSets(namespace).DeleteCollection(nil, listOptions)
	return
}

// GetObjectList returns a slice of runtime.Object
func GetObjectList(list *v1.StatefulSetList) (res []runtime.Object) {
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
	if deploy, ok := obj.(*v1.StatefulSet); ok {
		name = deploy.GetName()
		err = client.AppsV1().StatefulSets(deploy.GetNamespace()).Delete(deploy.GetName(), nil)
	} else {
		err = fmt.Errorf("StatefulSet runtime is not a valid object type: %v", obj)
	}
	return
}
