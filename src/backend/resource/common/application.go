package common

import (
	"log"
	"reflect"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/errors"
	client "k8s.io/client-go/kubernetes"
)

type RevisionDetail struct {
	//AppName means this resource belongs app name
	Revision int64 `json:"revision"`
}

type AppNameDetail struct {
	//AppName means this resource belongs app name
	AppName string `json:"appName"`
}

func GetRelationResource(k8sclient client.Interface, namespace string) (rc *ResourceCollection, nonCriticalErrors []error, criticalError error) {
	nonCriticalErrors = make([]error, 0)
	nsQuery := NewNamespaceQuery([]string{namespace})
	channels := &ResourceChannels{
		PodList:        GetPodListChannel(k8sclient, nsQuery, 1),
		EventList:      GetEventListChannel(k8sclient, nsQuery, 1),
		ReplicaSetList: GetReplicaSetListChannel(k8sclient, nsQuery, 1),
	}

	pods := <-channels.PodList.List
	err := <-channels.PodList.Error

	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, nonCriticalErrors, criticalError
	}

	events := <-channels.EventList.List
	err = <-channels.EventList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, nonCriticalErrors, criticalError
	}

	rs := <-channels.ReplicaSetList.List
	err = <-channels.ReplicaSetList.Error
	nonCriticalErrors, criticalError = errors.AppendError(err, nonCriticalErrors)
	if criticalError != nil {
		return nil, nonCriticalErrors, criticalError
	}

	rc = &ResourceCollection{
		Pods:        pods.Items,
		Events:      events.Items,
		ReplicaSets: rs.Items,
	}
	return rc, nonCriticalErrors, criticalError
}

func GetAppNameFromAppcore(appCoreClient *appCore.ApplicationClient, resource interface{}, ch chan string) {

	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		ch <- ""
		return
	}

	appName := appCoreClient.FindApplicationName(GetLocalBaseDomain(), uns)
	ch <- appName
	return
}

func SyncGetAppNameFromAppcore(appCoreClient *appCore.ApplicationClient, resource interface{}) string {

	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return ""
	}

	appName := appCoreClient.FindApplicationName(GetLocalBaseDomain(), uns)
	return appName
}

func ToSlice(arr interface{}) []interface{} {
	v := reflect.ValueOf(arr)
	if v.Kind() != reflect.Slice {
		return nil
	}
	l := v.Len()
	ret := make([]interface{}, l)
	for i := 0; i < l; i++ {
		ret[i] = v.Index(i).Interface()
	}
	return ret
}

func GetAppNameListFromAppcore(appCoreClient *appCore.ApplicationClient, sliceResources interface{}, filteredTotal int) []string {

	resources := ToSlice(sliceResources)
	if resources == nil {
		return nil
	}

	chanList := make([]chan string, filteredTotal)
	appNameList := make([]string, 0)
	for i := range resources {
		chanList[i] = make(chan string)
		go GetAppNameFromAppcore(appCoreClient, resources[i], chanList[i])
	}

	for i := range resources {
		appName := <-chanList[i]
		appNameList = append(appNameList, appName)
	}

	return appNameList
}

func UpdateResourceWithApplication(appCoreClient *appCore.ApplicationClient, resource interface{}, namespace, appName string) (criticalError error) {
	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return err
	}

	_, err = appCoreClient.UpdateApplicationResource(namespace, appName, uns)
	if err != nil {
		return err
	}

	return nil
}

func DeleteResourceFromApplication(appCoreClient *appCore.ApplicationClient, resource interface{}, namespace string) (criticalError error) {
	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return err
	}

	appName := SyncGetAppNameFromAppcore(appCoreClient, uns)
	_, result := appCoreClient.DeleteApplicationResource(namespace, appName, appCore.NewGVKName(uns.GroupVersionKind(), uns.GetName()))
	if result.CombineError() != nil {
		log.Println("appcore err is ?", result.CombineError(), " ", appName, " ", namespace)
		return result.CombineError()
	}

	return nil
}

func CreateResourceAndIpmortToApplication(appCoreClient *appCore.ApplicationClient, resource interface{}, namespace, appName string) (criticalError error) {
	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return err
	}

	_, result := appCoreClient.AddApplicationResource(namespace, appName, uns)
	if result.CombineError() != nil {
		log.Println("appcore err is ?", result.CombineError(), " ", appName, " ", namespace)
		return result.CombineError()
	}

	return nil
}

func UpdateResourceBelongApplication(appCoreClient *appCore.ApplicationClient, resource interface{}, namespace, oldAppName, newAppName string) (criticalError error) {

	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return err
	}

	isNeedRemoveOld := false
	isNeedImprotNew := false

	if oldAppName != "" && newAppName != "" && newAppName != oldAppName {
		//appName change ,remove old ,import new
		isNeedRemoveOld = true
		isNeedImprotNew = true
	} else if oldAppName != "" && newAppName == "" {
		//old have value,new not,remove old only
		isNeedRemoveOld = true
	} else if oldAppName == "" && newAppName != "" {
		//old no value,new have val,ipmport noly
		isNeedImprotNew = true
	} else {
		return nil
	}

	if isNeedRemoveOld {
		_, result := appCoreClient.RemoveApplicationResource(namespace, oldAppName, uns)
		if result.CombineError() != nil {
			return result.CombineError()
		}
	}

	if isNeedImprotNew {
		_, result := appCoreClient.ImportApplicationResource(namespace, newAppName, uns)
		if result.CombineError() != nil {
			return result.CombineError()
		}
	}

	return nil
}

func ImportResourceToApplication(appCoreClient *appCore.ApplicationClient, resource interface{}, namespace, appName string) (criticalError error) {
	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return err
	}

	_, result := appCoreClient.ImportApplicationResource(namespace, appName, uns)
	if result.CombineError() != nil {
		return result.CombineError()
	}

	return nil
}

func RemoveResourceFromApplication(appCoreClient *appCore.ApplicationClient, resource interface{}, namespace, appName string) (criticalError error) {
	uns, err := ConvertResourceToUnstructured(resource)
	if err != nil {
		return err
	}
	_, result := appCoreClient.RemoveApplicationResource(namespace, appName, uns)
	if result.CombineError() != nil {
		return result.CombineError()
	}

	return nil
}
