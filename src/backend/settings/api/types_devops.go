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

package api

import (
	"alauda.io/devops-apiserver/pkg/toolchain"
	"encoding/json"
)

const (
	SettingsDevopsConfigMapName         = "devops-config"
	SettingsDevopsConfigMapNamespace    = "alauda-system"
	SettingsDevopsDataKeyDefaultDomain  = "defaultDomain"
	SettingsDevopsDomainGlobalConfigKey = "_domain"
	VersionGateGA                       = "ga"
	VersionGateAlpha                    = "alpha"
	VersionGateBeta                     = "beta"
)

func init() {
	addHook(addDevopsDefault)
}

type DevopsSettings struct {
	DefaultDomain string               `json:"defaultDomain"`
	Integrations  []interface{}        `json:"integrations"`
	PortalLinks   interface{}          `json:"portal_link"`
	ToolChains    []toolchain.Category `json:"toolChains"`
	VersionGate   string               `json:"versionGate"`
}

func (s DevopsSettings) Marshal() string {
	bytes, _ := json.Marshal(s)
	return string(bytes)
}

// UnmarshalDevops settings from JSON string into object.
func UnmarshalDevops(data string) (*DevopsSettings, error) {
	s := new(DevopsSettings)
	err := json.Unmarshal([]byte(data), s)
	return s, err
}

func GetDevopsDefaultSettings() DevopsSettings {
	return DevopsSettings{
		// Namespace:     SettingsDevopsConfigMapNamespace,
		// Name:          SettingsDevopsConfigMapName,
		DefaultDomain: "",
		VersionGate:   VersionGateGA,
	}
}

// GetDefaultSettingsConfigMap returns config map with default settings.
// func GetDefaultSettingsDevopsConfigMap() *corev1.ConfigMap {
// 	return &corev1.ConfigMap{
// 		ObjectMeta: metav1.ObjectMeta{
// 			Name:      SettingsDevopsConfigMapName,
// 			Namespace: SettingsDevopsConfigMapNamespace,
// 		},
// 		TypeMeta: metav1.TypeMeta{
// 			Kind:       ConfigMapKindName,
// 			APIVersion: ConfigMapAPIVersion,
// 		},
// 		Data: map[string]string{
// 			SettingsDevopsDataKeyDefaultDomain: "",
// 		},
// 	}
// }

func addDevopsDefault(config map[string]string) map[string]string {
	config[SettingsDevopsDomainGlobalConfigKey] = GetDevopsDefaultSettings().Marshal()
	return config
}
