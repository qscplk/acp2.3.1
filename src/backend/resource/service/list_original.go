package service

import (
	"fmt"
	"sync"

	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	v1 "k8s.io/api/core/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	client "k8s.io/client-go/kubernetes"
)

func setTypeMeta(cm *v1.Service) {
	cm.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "",
		Version: "v1",
		Kind:    "Service",
	})
}

// GetOriginalList get original list from api
func GetOriginalList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (list *v1.ServiceList, err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	list, err = client.CoreV1().Services(namespace).List(listOptions)
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
	// For some reason service does not allow DeleteCollection
	var svcList *v1.ServiceList
	svcList, err = GetOriginalList(client, nsQuery, dsQuery)
	if err != nil {
		return
	}
	if svcList != nil && len(svcList.Items) > 0 {
		namespace := nsQuery.ToRequestParam()
		// listOptions := common.ConvertToListOptions(dsQuery)
		var (
			wait sync.WaitGroup
			errs = make([]error, 0, len(svcList.Items))
		)
		for _, svc := range svcList.Items {
			wait.Add(1)
			go func(name string) {
				if delErr := client.CoreV1().Services(namespace).Delete(name, nil); delErr != nil {
					errs = append(errs, delErr)
				}
				wait.Done()
			}(svc.GetName())
		}
		wait.Wait()
		if len(errs) > 0 {
			for _, e := range errs {
				_, err = errors.HandleError(e)
				if err != nil {
					break
				}
			}
		}
	}
	return
}

// GetObjectList returns a slice of runtime.Object
func GetObjectList(list *v1.ServiceList) (res []runtime.Object) {
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
	if res, ok := obj.(*v1.Service); ok {
		name = res.GetName()
		err = client.CoreV1().Services(res.GetNamespace()).Delete(res.GetName(), nil)
	} else {
		err = fmt.Errorf("Service runtime is not a valid object type: %v", obj)
	}
	return
}
