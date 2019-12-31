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
	"fmt"
	"log"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

// ConfigMapDetail API resource provides mechanisms to inject containers with configuration data while keeping
// containers agnostic of Kubernetes
type ConfigMapDetail struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	//AppName mens this resource belongs app name
	AppName string `json:"appName"`

	// Data contains the configuration data.
	// Each key must be a valid DNS_SUBDOMAIN with an optional leading dot.
	Data map[string]string `json:"data,omitempty"`
}

// GetConfigMapDetail returns detailed information about a config map
func GetConfigMapDetail(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace, name string) (*ConfigMapDetail, error, *v1.ConfigMap) {
	log.Printf("Getting details of %s config map in %s namespace", name, namespace)

	rawConfigMap, err := client.CoreV1().ConfigMaps(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err, nil
	}
	setTypeMeta(rawConfigMap)

	cmdetail, err := getConfigMapDetailAndAppName(rawConfigMap, appCoreClient)
	if err != nil {
		return nil, err, nil
	}

	return cmdetail, nil, rawConfigMap
}

func getConfigMapDetailAndAppName(rawConfigMap *v1.ConfigMap, appCoreClient *appCore.ApplicationClient) (*ConfigMapDetail, error) {

	uns, err := common.ConvertResourceToUnstructured(rawConfigMap)
	if err != nil {
		return nil, err
	}

	details := &ConfigMapDetail{
		ObjectMeta: api.NewObjectMeta(rawConfigMap.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindConfigMap),
		Data:       rawConfigMap.Data,
		AppName:    appCoreClient.FindApplicationName(common.GetLocalBaseDomain(), uns),
	}

	return details, nil
}

func DeleteConfigMap(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, name string) error {

	detailConfigMap, err, originConfigMap := GetConfigMapDetail(client, appCoreClient, namespace, name)
	setTypeMeta(originConfigMap)

	if detailConfigMap.AppName != "" {
		return errors.NewForbidden(schema.GroupResource{}, originConfigMap.GetName(),
			fmt.Errorf("configmap '%s' is not allowed to delete if it is relate by app", originConfigMap.GetName()))
	}

	err = client.CoreV1().ConfigMaps(namespace).Delete(name, &metaV1.DeleteOptions{})
	if err != nil {
		return err
	}

	return err
}

func CreateConfigMap(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, spec *ConfigMapDetail) (*ConfigMapDetail, error) {

	configmap := &v1.ConfigMap{
		ObjectMeta: metaV1.ObjectMeta{
			Name:        spec.ObjectMeta.Name,
			Namespace:   namespace,
			Annotations: spec.ObjectMeta.Annotations,
		},
		Data: spec.Data,
	}
	setTypeMeta(configmap)

	var newConfigMap *v1.ConfigMap
	var err error

	if spec.AppName == "" {
		newConfigMap, err = client.CoreV1().ConfigMaps(namespace).Create(configmap)
		if err != nil {
			return nil, err
		}
	} else {
		err = common.CreateResourceAndIpmortToApplication(appCoreClient, configmap,
			namespace, spec.AppName)
		if err != nil {
			return nil, err
		}
		_, err, newConfigMap = GetConfigMapDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
		if err != nil {
			return nil, err
		}
	}

	details := &ConfigMapDetail{
		ObjectMeta: api.NewObjectMeta(newConfigMap.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindConfigMap),
		AppName:    spec.AppName,
		Data:       newConfigMap.Data,
	}

	return details, err
}

func updateConfigMapWithNoNewAppName(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, oldAppName, namespace string, configmap *v1.ConfigMap) error {

	err := common.RemoveResourceFromApplication(appCoreClient, configmap,
		namespace, oldAppName)
	if err != nil {
		return err
	}

	_, err = client.CoreV1().ConfigMaps(namespace).Update(configmap)
	if err != nil {
		return err
	}
	return nil
}

func updateConfigMapWithAppNameChange(appCoreClient *appCore.ApplicationClient, oldAppName, newAppName, namespace string, configmap *v1.ConfigMap) error {

	err := common.RemoveResourceFromApplication(appCoreClient, configmap,
		namespace, oldAppName)
	if err != nil {
		return err
	}

	err = common.UpdateResourceWithApplication(appCoreClient, configmap,
		namespace, newAppName)
	if err != nil {
		return err
	}
	return nil
}

func UpdateConfigMap(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, spec *ConfigMapDetail) (*ConfigMapDetail, error) {

	oldConfigMapDetail, err, configmap := GetConfigMapDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	newMeta := api.NewRawObjectMeta(spec.ObjectMeta)
	configmap.ObjectMeta = api.CompleteMeta(newMeta, configmap.ObjectMeta)
	configmap.Data = spec.Data
	setTypeMeta(configmap)

	if oldConfigMapDetail.AppName != "" && spec.AppName != "" && spec.AppName == oldConfigMapDetail.AppName {
		//old hava val,new have val, and same,update use appcore api
		err = common.UpdateResourceWithApplication(appCoreClient, configmap, namespace, spec.AppName)
	} else if oldConfigMapDetail.AppName != "" && spec.AppName != "" && spec.AppName != oldConfigMapDetail.AppName {
		//appName change ,remove old ,update use appcore api
		err = updateConfigMapWithAppNameChange(appCoreClient, oldConfigMapDetail.AppName, spec.AppName, namespace, configmap)

	} else if oldConfigMapDetail.AppName != "" && spec.AppName == "" {
		// old have val,new no val ,remove old ,origin update new
		err = updateConfigMapWithNoNewAppName(client, appCoreClient, oldConfigMapDetail.AppName, namespace, configmap)

	} else if oldConfigMapDetail.AppName == "" && spec.AppName != "" {
		//old no value,new have val
		err = common.UpdateResourceWithApplication(appCoreClient, configmap,
			namespace, spec.AppName)
	} else if oldConfigMapDetail.AppName == "" && spec.AppName == "" {
		//old no val,new no val,use origin api
		_, err = client.CoreV1().ConfigMaps(namespace).Update(configmap)
	} else {
		err = nil
	}

	if err != nil {
		return nil, err
	}

	_, err, newConfigMap := GetConfigMapDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	details := &ConfigMapDetail{
		ObjectMeta: api.NewObjectMeta(newConfigMap.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindConfigMap),
		Data:       newConfigMap.Data,
		AppName:    spec.AppName,
	}

	return details, err
}
