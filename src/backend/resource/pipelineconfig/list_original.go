package pipelineconfig

import (
	"fmt"

	v1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	client "k8s.io/client-go/kubernetes"
)

func setTypeMeta(pc *v1alpha1.PipelineConfig) {
	pc.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "devops.alauda.io",
		Version: "v1alpha1",
		Kind:    "PipelineConfig",
	})
}

// GetOriginalList get original list from api
func GetOriginalList(client client.Interface, devopsClient devopsclient.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (list *v1alpha1.PipelineConfigList, err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	list, err = devopsClient.DevopsV1alpha1().PipelineConfigs(namespace).List(listOptions)
	// list, err = client.AppsV1().Deployments(namespace).List(listOptions)
	if list != nil && list.Items != nil {
		for x, d := range list.Items {
			newD := d.DeepCopy()
			setTypeMeta(newD)
			list.Items[x] = *newD
		}
	}
	return

	// devopsClient.DevopsV1alpha1().PipelineConfigs(namespace).DeleteCollection()
}

func DeleteOriginalList(client client.Interface, devopsClient devopsclient.Interface, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (err error) {
	namespace := nsQuery.ToRequestParam()
	listOptions := common.ConvertToListOptions(dsQuery)
	err = devopsClient.DevopsV1alpha1().PipelineConfigs(namespace).DeleteCollection(nil, listOptions)
	return
}

// GetObjectList returns a slice of runtime.Object
func GetObjectList(list *v1alpha1.PipelineConfigList) (res []runtime.Object) {
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

func DeleteObject(client devopsclient.Interface, obj runtime.Object) (name string, err error) {
	if res, ok := obj.(*v1alpha1.PipelineConfig); ok {
		name = res.GetName()
		err = client.DevopsV1alpha1().PipelineConfigs(res.GetNamespace()).Delete(res.GetName(), nil)
	} else {
		err = fmt.Errorf("PipelineConfig runtime is not a valid object type: %v", obj)
	}
	return
}
