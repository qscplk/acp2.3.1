package release

import (
	"catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
	ccClient "catalog-controller/pkg/client/clientset/versioned"
	"log"

	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func setTypeMeta(release *v1alpha1.Release) {
	release.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "",
		Version: "v1alpha1",
		Kind:    "Release",
	})
}

// GetOriginalList get original list from api
func GetOriginalList(client ccClient.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (list *v1alpha1.ReleaseList, err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	log.Println("Getting list of release in the namespace:"+namespace+" listOptions: ", listOptions)

	list, err = client.CatalogControllerV1alpha1().Releases(namespace).List(listOptions)
	if list != nil && list.Items != nil {
		for x, d := range list.Items {
			newD := d.DeepCopy()
			setTypeMeta(newD)
			list.Items[x] = *newD
		}
	}
	return
}

// GetObjectList returns a slice of runtime.Object
func GetObjectList(list *v1alpha1.ReleaseList) (res []runtime.Object) {
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

// DeleteOriginalList deletes a list using a query selector
func DeleteOriginalList(client ccClient.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	err = client.CatalogControllerV1alpha1().Releases(namespace).DeleteCollection(nil, listOptions)
	return
}
