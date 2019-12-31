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

package settings

import (
	"errors"
	"log"
	"reflect"

	backendapi "alauda.io/diablo/src/backend/api"
	clientapi "alauda.io/diablo/src/backend/client/api"
	"alauda.io/diablo/src/backend/settings/api"
	"k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

// SettingsManager is a structure containing all settings manager members.
type SettingsManager struct {
	settings        *api.Settings
	devopsSettings  *api.DevopsSettings
	authSettings    *api.AuthSettings
	rawSettings     map[string]string
	authRawSettings map[string]string
	clientManager   clientapi.ClientManager
}

// NewSettingsManager creates new settings manager.
func NewSettingsManager(clientManager clientapi.ClientManager) *SettingsManager {
	return &SettingsManager{
		// settings:      make(map[string]api.Settings),
		clientManager: clientManager,
	}
}

// load config map data into settings manager and return true if new settings are different.
func (sm *SettingsManager) load(client kubernetes.Interface) (configMap *v1.ConfigMap, isDifferent bool) {
	var err error
	configMap, isDifferent, err = sm.loadConfigMap(client, api.SettingsConfigMapNamespace, api.SettingsConfigMapName, sm.rawSettings)
	if err != nil {
		sm.restoreConfigMap(client)
		return
	}
	if isDifferent {
		sm.rawSettings = configMap.Data
		sm.restoreFromRaw()
	}
	return
}

// loadAuth auth config map data into settings manager and return true if new settings are different.
func (sm *SettingsManager) loadAuth(client kubernetes.Interface) (configMap *v1.ConfigMap, isDifferent bool) {
	var err error
	configMap, isDifferent, err = sm.loadConfigMap(client, api.SettingsAuthConfigMapNamespace, api.SettingsAuthConfigMapName, sm.authRawSettings)
	if err != nil {
		var authSettings *api.AuthSettings
		globalConfigMap, _ := sm.load(client)
		if globalConfigMap != nil && globalConfigMap.Data != nil {
			authSettings, _ = api.UnmarshalAuth(globalConfigMap.Data[api.SettingsAuthGlobalConfigKey])
		}
		configMap = sm.restoreAuthConfigMap(client, authSettings)
		if configMap == nil {
			return
		}
		isDifferent = true
	}
	if isDifferent {
		sm.authRawSettings = configMap.Data
		sm.restoreFromRawAuth()
	}
	return
}

func (sm *SettingsManager) loadConfigMap(client kubernetes.Interface, namespace, name string, old map[string]string) (configMap *v1.ConfigMap, isDifferent bool, err error) {
	configMap, err = client.CoreV1().ConfigMaps(namespace).Get(name, backendapi.GetOptionsInCache)
	if err != nil {
		log.Printf("Cannot find settings config map: %s", err.Error())
		return
	}
	// Check if anything has changed from the last time when function was executed.
	isDifferent = !reflect.DeepEqual(old, configMap.Data)
	return
}

func (sm *SettingsManager) setAuthSettings(authSett *api.AuthSettings) {
	sm.authSettings = authSett
	sm.clientManager.SetAuthSettings(authSett)
}

func (sm *SettingsManager) restoreFromRaw() {
	var (
		err        error
		sett       *api.Settings
		devopsSett *api.DevopsSettings
	)
	for key, value := range sm.rawSettings {
		err = nil
		switch key {
		case api.GlobalSettingsKey:
			sett, err = api.Unmarshal(value)
			if sett != nil {
				sm.settings = sett
			}
		case api.SettingsDevopsDomainGlobalConfigKey:
			devopsSett, err = api.UnmarshalDevops(value)
			if devopsSett != nil {
				sm.devopsSettings = devopsSett
			}
		}
		if err != nil {
			log.Printf("Cannot unmarshal settings key %s with %s value: %s", key, value, err.Error())
		}
	}
}

func (sm *SettingsManager) restoreFromRawAuth() {
	authSett, err := api.AuthSettingsFromData(sm.authRawSettings)
	if err != nil {
		log.Printf("Cannot unmarshal auth settings value: %v, err: %s", sm.authRawSettings, err.Error())
	}
	if authSett != nil {
		sm.setAuthSettings(authSett)
	}
}

// restoreConfigMap restores settings config map using default global settings.
func (sm *SettingsManager) restoreConfigMap(client kubernetes.Interface) {
	restoredConfigMap, err := client.CoreV1().ConfigMaps(api.SettingsConfigMapNamespace).
		Create(api.GetDefaultSettingsConfigMap())
	if err != nil {
		log.Printf("Cannot restore settings config map: %s", err.Error())
	} else {
		sm.rawSettings = restoredConfigMap.Data
		sm.restoreFromRaw()
	}
}

func (sm *SettingsManager) restoreAuthConfigMap(client kubernetes.Interface, legacy *api.AuthSettings) *v1.ConfigMap {
	cm := api.GetAuthDefaultSettingsConfigMap()
	if legacy != nil {
		cm.Data = legacy.GetData()
	}
	restoredConfigMap, err := client.CoreV1().ConfigMaps(api.SettingsAuthConfigMapNamespace).
		Create(cm)
	if err != nil {
		log.Printf("Cannot restore settings config map: %s", err.Error())
	} else {
		sm.authRawSettings = restoredConfigMap.Data
		sm.restoreFromRawAuth()
	}
	return restoredConfigMap
}

// GetGlobalSettings implements SettingsManager interface. Check it for more information.
func (sm *SettingsManager) GetGlobalSettings(client kubernetes.Interface) *api.Settings {
	cm, _ := sm.load(client)
	var settings api.Settings
	if cm == nil {
		settings = api.GetDefaultSettings()
		return &settings
	}

	s := sm.settings
	if s == nil {
		settings = api.GetDefaultSettings()
		return &settings
	}

	// return *s
	return s
}

// SaveGlobalSettings implements SettingsManager interface. Check it for more information.
func (sm *SettingsManager) SaveGlobalSettings(client kubernetes.Interface, s *api.Settings) error {
	cm, isDiff := sm.load(client)
	if isDiff {
		return errors.New(api.ConcurrentSettingsChangeError)
	}

	cm.Data[api.GlobalSettingsKey] = s.Marshal()
	_, err := client.CoreV1().ConfigMaps(api.SettingsConfigMapNamespace).Update(cm)
	return err
}

// GetDevopsSettings implements SettingsManager interface. Check it for more information.
func (sm *SettingsManager) GetDevopsSettings(client kubernetes.Interface) *api.DevopsSettings {
	cm, _ := sm.load(client)
	var settings api.DevopsSettings
	if cm == nil {
		settings = api.GetDevopsDefaultSettings()
		return &settings
	}

	s := sm.devopsSettings
	if s == nil {
		settings = api.GetDevopsDefaultSettings()
		return &settings
	}

	// return *s
	return s
}

// SaveDevopsSettings implements SettingsManager interface. Check it for more information.
func (sm *SettingsManager) SaveDevopsSettings(client kubernetes.Interface, s *api.DevopsSettings) error {
	cm, isDiff := sm.load(client)
	if isDiff {
		return errors.New(api.ConcurrentSettingsChangeError)
	}

	cm.Data[api.SettingsDevopsDomainGlobalConfigKey] = s.Marshal()
	_, err := client.CoreV1().ConfigMaps(api.SettingsConfigMapNamespace).Update(cm)
	return err
}

// GetAuthSettings implements SettingsManager interface. Check it for more information.
func (sm *SettingsManager) GetAuthSettings(client kubernetes.Interface) (authSettings *api.AuthSettings) {
	defaultSettings := api.GetAuthDefaultSettings()
	authSettings = &defaultSettings

	// loading configmap from the system
	cm, _ := sm.loadAuth(client)
	if cm == nil {
		sm.clientManager.SetAuthSettings(authSettings)
		return
	}
	// if we have current settings, we should return it
	currentSettings := sm.authSettings
	if currentSettings != nil {
		authSettings = currentSettings
	}
	sm.clientManager.SetAuthSettings(authSettings)
	return
}

// SaveAuthSettings implements SettingsManager interface. Check it for more information.
func (sm *SettingsManager) SaveAuthSettings(client kubernetes.Interface, s *api.AuthSettings) error {
	cm, isDiff := sm.loadAuth(client)
	if isDiff {
		return errors.New(api.ConcurrentSettingsChangeError)
	}
	if cm == nil {
		cm = api.GetAuthDefaultSettingsConfigMap()
	}

	cm.Data = s.GetData()
	_, err := client.CoreV1().ConfigMaps(api.SettingsAuthConfigMapNamespace).Update(cm)
	sm.authRawSettings = cm.Data
	sm.restoreFromRawAuth()
	return err
}

// func (sm *SettingsManager) GetDevopsSettings(client kubernetes.Interface) api.DevopsSettings {
// 	devopsSettings := api.GetDevopsDefaultSettings() // defaultDomain == ""
// 	cm, _ := sm.loadDevops(client)
// 	if cm == nil {
// 		return devopsSettings
// 	}

// 	if defaultDomain, ok := sm.devopsSettings[api.SettingsDevopsDataKeyDefaultDomain]; ok && defaultDomain != "" {
// 		devopsSettings.DefaultDomain = defaultDomain // defaultDomain != ""
// 	}
// 	return devopsSettings
// }

// func (sm *SettingsManager) restoreDevopsConfigMap(client kubernetes.Interface) {
// 	restoredDevopsConfigMap, err := client.CoreV1().ConfigMaps(api.SettingsDevopsConfigMapNamespace).
// 		Create(api.GetDefaultSettingsDevopsConfigMap())
// 	if err != nil {
// 		log.Printf("Cannot restore devops settings config map: %s", err.Error())
// 	} else {
// 		sm.devopsSettings = restoredDevopsConfigMap.Data
// 	}
// }

// func (sm *SettingsManager) loadDevops(client kubernetes.Interface) (configMap *v1.ConfigMap, isDifferent bool) {
// 	configMap, err := client.CoreV1().ConfigMaps(api.SettingsDevopsConfigMapNamespace).
// 		Get(api.SettingsDevopsConfigMapName, metav1.GetOptions{})
// 	if err != nil {
// 		log.Printf("Cannot find devops settings config map: %s", err.Error())
// 		sm.restoreDevopsConfigMap(client)
// 		return
// 	}

// 	isDifferent = !reflect.DeepEqual(sm.devopsSettings, configMap.Data)
// 	if isDifferent {
// 		sm.devopsSettings = configMap.Data
// 	}
// 	return
// }
