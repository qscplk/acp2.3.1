package other

import (
	"log"
	"strings"
	"sync"

	"alauda.io/diablo/src/backend/api"
	clientapi "alauda.io/diablo/src/backend/client/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"github.com/emicklei/go-restful"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

var unListedResource = []string{"Event"}

func GetResourceList(client dynamic.NamespaceableResourceInterface, resource *v1.APIResource) ([]*ResourceMeta, error) {
	resourceList, err := client.Namespace("").List(api.ListEverything)
	if err != nil {
		return nil, err
	}

	result := []*ResourceMeta{}
	for _, i := range resourceList.Items {
		resourceMeta := ResourceMeta{
			ObjectMeta: api.ObjectMeta{
				Name:              i.GetName(),
				Namespace:         i.GetNamespace(),
				Labels:            i.GetLabels(),
				Annotations:       i.GetAnnotations(),
				CreationTimestamp: i.GetCreationTimestamp(),
				Uid:               string(i.GetUID()),
			},
			TypeMeta: ResourceTypeMeta{
				Name:         resource.Name,
				Kind:         i.GetKind(),
				GroupVersion: i.GetAPIVersion(),
			},
		}
		resourceMeta.setScope()
		result = append(result, &resourceMeta)
	}
	return result, nil
}

func GetCanListResource(client kubernetes.Interface) ([]v1.APIResource, error) {
	serverResourceList, err := client.Discovery().ServerResources()
	if err != nil {
		return nil, err
	}
	result := []v1.APIResource{}
	for _, rl := range serverResourceList {
		for _, r := range rl.APIResources {
			if canResourceList(r) {
				gv, _ := schema.ParseGroupVersion(rl.GroupVersion)
				r.Version = gv.Version
				r.Group = gv.Group
				result = append(result, r)
				if _, ok := KindToName[r.Kind]; !ok {
					KindToName[r.Kind] = r.Name
				}
			}
		}
	}
	return result, nil
}

func canResourceList(resource v1.APIResource) bool {
	if strings.Contains(resource.Name, "/") {
		return false
	}

	for _, r := range unListedResource {
		if r == resource.Kind {
			return false
		}
	}

	for _, v := range resource.Verbs {
		if v == "list" {
			return true
		}
	}
	return false
}

func GetAllResourceList(cm clientapi.ClientManager, req *restful.Request, dsQuery *dataselect.DataSelectQuery) (*ResourceList, error) {
	k8sClient, err := cm.Client(req)
	if err != nil {
		return nil, err
	}
	resourceTypes, err := GetCanListResource(k8sClient)
	if err != nil {
		return nil, err
	}

	var wg sync.WaitGroup
	resourceChannel := make(chan []*ResourceMeta, 1000)
	errorChannel := make(chan error, 1000)
	for _, rt := range resourceTypes {
		wg.Add(1)
		dyClient, err := cm.DynamicClient(req, &schema.GroupVersionKind{Group: rt.Group, Version: rt.Version, Kind: rt.Kind})
		if err != nil {
			return nil, err
		}
		go func(resource v1.APIResource) {
			resources, err := GetResourceList(dyClient, &resource)
			if err != nil {
				log.Printf("get resource %s error", rt.Name)
				errorChannel <- err
			} else {
				resourceChannel <- resources
			}
			wg.Done()
		}(rt)
	}
	wg.Wait()
	close(resourceChannel)
	close(errorChannel)

	result := ResourceList{}
	rawResources := make([]*ResourceMeta, 0, len(resourceChannel))
	for resources := range resourceChannel {
		rawResources = append(rawResources, resources...)
	}

	rawResources = ResourceMetaList(rawResources).unique()

	rCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(rawResources), dsQuery)
	for err := range errorChannel {
		result.Errors = append(result.Errors, err)
	}
	result.ListMeta.TotalItems = filteredTotal
	result.Resources = fromCells(rCells)
	return &result, nil
}
