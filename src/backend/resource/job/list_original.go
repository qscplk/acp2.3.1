package job

import (
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	v1 "k8s.io/api/batch/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	client "k8s.io/client-go/kubernetes"
)

func setTypeMeta(cm *v1.Job) {
	cm.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "batch",
		Version: "v1",
		Kind:    "Job",
	})
}

// GetOriginalList get original list from api
func GetOriginalList(client client.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (list *v1.JobList, err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	list, err = client.BatchV1().Jobs(namespace).List(listOptions)
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
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	err = client.BatchV1().Jobs(namespace).DeleteCollection(nil, listOptions)
	return
}

// GetObjectList returns a slice of runtime.Object
func GetObjectList(list *v1.JobList) (res []runtime.Object) {
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
