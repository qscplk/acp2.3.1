// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package configmap

import (
	"log"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/api/core/v1"
	kubernetes "k8s.io/client-go/kubernetes"
)

// ConfigMapList contains a list of Config Maps in the cluster.
type ConfigMapList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Config Maps
	Items []ConfigMap `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *ConfigMapList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.Items))
		for i, d := range list.Items {
			res[i] = d
		}
	}
	return
}

// ConfigMap API resource provides mechanisms to inject containers with configuration data while keeping
// containers agnostic of Kubernetes
type ConfigMap struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`
	AppName    string         `json:"appName"`
	Keys       []string       `json:"keys,omitempty"`
}

func (cm ConfigMap) GetObjectMeta() api.ObjectMeta {
	return cm.ObjectMeta
}

// GetConfigMapList returns a list of all ConfigMaps in the cluster.
func GetConfigMapList(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*ConfigMapList, error) {
	log.Printf("Getting list config maps in the namespace %s", nsQuery.ToRequestParam())
	channels := &common.ResourceChannels{
		ConfigMapList: common.GetConfigMapListChannel(client, nsQuery, 1),
	}

	return GetConfigMapListFromChannels(channels, dsQuery, appCoreClient)
}

// GetConfigMapListFromChannels returns a list of all Config Maps in the cluster reading required resource list once from the channels.
func GetConfigMapListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery, appCoreClient *appCore.ApplicationClient) (*ConfigMapList, error) {
	configMaps := <-channels.ConfigMapList.List
	err := <-channels.ConfigMapList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	result := toConfigMapList(configMaps.Items, nonCriticalErrors, dsQuery, appCoreClient)

	return result, nil
}

func toConfigMap(cm v1.ConfigMap, appName string) ConfigMap {
	keys := make([]string, 0, len(cm.Data))
	for k := range cm.Data {
		keys = append(keys, k)
	}
	return ConfigMap{
		ObjectMeta: api.NewObjectMeta(cm.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindConfigMap),
		Keys:       keys,
		AppName:    appName,
	}
}

func toConfigMapList(configMaps []v1.ConfigMap, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery, appCoreClient *appCore.ApplicationClient) *ConfigMapList {
	result := &ConfigMapList{
		Items:    make([]ConfigMap, 0),
		ListMeta: api.ListMeta{TotalItems: len(configMaps)},
		Errors:   nonCriticalErrors,
	}

	configMapCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(configMaps), dsQuery)
	configMaps = fromCells(configMapCells)
	result.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for i := range configMaps {
		setTypeMeta(&configMaps[i])
	}

	appNameList := common.GetAppNameListFromAppcore(appCoreClient, configMaps, filteredTotal)
	if appNameList != nil {
		for i := range configMaps {
			result.Items = append(result.Items, toConfigMap(configMaps[i], appNameList[i]))
		}
	}

	return result
}

func ToConfigMapList(res []common.Resource) (list []ConfigMap) {
	var (
		ok bool
		cm ConfigMap
	)
	list = make([]ConfigMap, 0, len(res))
	for _, r := range res {
		if cm, ok = r.(ConfigMap); ok {
			list = append(list, cm)
		}
	}
	return
}
