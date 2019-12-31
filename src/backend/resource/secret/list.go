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

package secret

import (
	appCore "alauda.io/app-core/pkg/app"
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

// SecretSpec is a common interface for the specification of different secrets.
type SecretSpec interface {
	GetName() string
	GetType() v1.SecretType
	GetNamespace() string
	GetData() map[string][]byte
}

// ImagePullSecretSpec is a specification of an image pull secret implements SecretSpec
type ImagePullSecretSpec struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`

	// The value of the .dockercfg property. It must be Base64 encoded.
	Data []byte `json:"data"`
}

// GetName returns the name of the ImagePullSecret
func (spec *ImagePullSecretSpec) GetName() string {
	return spec.Name
}

// GetType returns the type of the ImagePullSecret, which is always api.SecretTypeDockercfg
func (spec *ImagePullSecretSpec) GetType() v1.SecretType {
	return v1.SecretTypeDockercfg
}

// GetNamespace returns the namespace of the ImagePullSecret
func (spec *ImagePullSecretSpec) GetNamespace() string {
	return spec.Namespace
}

// GetData returns the data the secret carries, it is a single key-value pair
func (spec *ImagePullSecretSpec) GetData() map[string][]byte {
	return map[string][]byte{v1.DockerConfigKey: spec.Data}
}

// GenericSecretSpec is a specification of an generic secret spec
type GenericSecretSpec struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`

	// Data property to store values
	Data map[string][]byte `json:"data"`
	Type v1.SecretType     `json:"type"`
}

// GetName returns the name of the ImagePullSecret
func (spec *GenericSecretSpec) GetName() string {
	return spec.Name
}

// GetType returns the type of the ImagePullSecret, which is always api.SecretTypeDockercfg
func (spec *GenericSecretSpec) GetType() v1.SecretType {
	return spec.Type
}

// GetNamespace returns the namespace of the ImagePullSecret
func (spec *GenericSecretSpec) GetNamespace() string {
	return spec.Namespace
}

// GetData returns the data the secret carries, it is a single key-value pair
func (spec *GenericSecretSpec) GetData() map[string][]byte {
	return spec.Data
}

// Secret is a single secret returned to the frontend.
type Secret struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`
	Type       v1.SecretType  `json:"type"`
	Keys       []string       `json:"keys"`
	AppName    string         `json:"appName"`
}

func (ing Secret) GetObjectMeta() api.ObjectMeta {
	return ing.ObjectMeta
}

// SecretsList is a response structure for a queried secrets list.
type SecretList struct {
	api.ListMeta `json:"listMeta"`

	// Unordered list of Secrets.
	Secrets []Secret `json:"secrets"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

var supportedSecretTypes = []v1.SecretType{v1.SecretTypeBasicAuth, v1.SecretTypeDockerConfigJson, v1.SecretTypeOpaque, v1.SecretTypeTLS, v1.SecretTypeSSHAuth, devopsv1alpha1.SecretTypeOAuth2}
var generatedSecretLabelKey = "alauda.io/generatorName"

var hiddenNamespaces = []string{devopsv1alpha1.NamespaceKubeSystem, devopsv1alpha1.NamespaceAlaudaSystem, devopsv1alpha1.NamespaceDefault}

func (list *SecretList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.Secrets))
		for i, d := range list.Secrets {
			res[i] = d
		}
	}
	return
}

// GetSecretList returns all secrets in the given namespace.
func GetSecretList(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace *common.NamespaceQuery,
	dsQuery *dataselect.DataSelectQuery, includePublic bool) (*SecretList, error) {
	curNamespace := namespace.ToRequestParam()
	log.Printf("Getting list of secrets in namespace %s", curNamespace)

	secretList, err := client.CoreV1().Secrets(curNamespace).List(api.ListEverything)
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	if curNamespace != "" && includePublic {
		publicSecretList, err := client.CoreV1().Secrets(devopsv1alpha1.NamespaceGlobalCredentials).List(api.ListEverything)
		nonCriticalErrors, criticalError = errors.HandleError(err)
		if criticalError != nil {
			return nil, criticalError
		}

		if publicSecretList != nil && len(publicSecretList.Items) > 0 {
			secretList.Items = append(secretList.Items, publicSecretList.Items...)
		}
	}

	// secret type list
	items := func(secrets []v1.Secret) []v1.Secret {
		filtered := make([]v1.Secret, 0, len(secrets))
		for _, s := range secrets {
			if len(s.ObjectMeta.Labels) > 0 && s.ObjectMeta.Labels[generatedSecretLabelKey] != "" {
				continue
			}
			for _, t := range supportedSecretTypes {
				if s.Type == t && !isHiddenNamespace(s.Namespace) {
					filtered = append(filtered, s)
					break
				}
			}
		}
		return filtered
	}(secretList.Items)

	return toSecretList(items, nonCriticalErrors, dsQuery, appCoreClient), nil
}

func isHiddenNamespace(namespace string) bool {
	for _, n := range hiddenNamespaces {
		if n == namespace {
			return true
		}
	}
	return false
}

// GetSecretListFromChannels returns a list of all Secrets in the cluster reading required resource list once from the channels.
func GetSecretListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery, appCoreClient *appCore.ApplicationClient) (*SecretList, error) {
	secretList := <-channels.SecretList.List
	err := <-channels.SecretList.Error

	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toSecretList(secretList.Items, nonCriticalErrors, dsQuery, appCoreClient), nil
}

func toSecret(secret *v1.Secret, appName string) *Secret {
	keys := make([]string, 0, len(secret.Data))
	for k := range secret.Data {
		keys = append(keys, k)
	}
	result := &Secret{
		ObjectMeta: api.NewObjectMeta(secret.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindSecret),
		Type:       secret.Type,
		Keys:       keys,
		AppName:    appName,
	}
	if result.ObjectMeta.Annotations == nil {
		result.ObjectMeta.Annotations = make(map[string]string, 0)
	}

	if secret.GetNamespace() == devopsv1alpha1.NamespaceGlobalCredentials {
		result.ObjectMeta.Annotations[devopsv1alpha1.LabelDevopsAlaudaIOGlobalKey] = devopsv1alpha1.TrueString
	}
	return result
}

func toSecretList(secrets []v1.Secret, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery, appCoreClient *appCore.ApplicationClient) *SecretList {
	newSecretList := &SecretList{
		ListMeta: api.ListMeta{TotalItems: len(secrets)},
		Secrets:  make([]Secret, 0),
		Errors:   nonCriticalErrors,
	}

	secretCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(secrets), dsQuery)
	secrets = fromCells(secretCells)
	newSecretList.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for i := range secrets {
		setTypeMeta(&secrets[i])
	}

	appNameList := common.GetAppNameListFromAppcore(appCoreClient, secrets, filteredTotal)
	if appNameList != nil {
		for i := range secrets {
			newSecretList.Secrets = append(newSecretList.Secrets, *toSecret(&secrets[i], appNameList[i]))
		}
	}

	return newSecretList
}

func ToSecretList(res []common.Resource) (list []Secret) {
	var (
		ok bool
		cm Secret
	)
	list = make([]Secret, 0, len(res))
	for _, r := range res {
		if cm, ok = r.(Secret); ok {
			list = append(list, cm)
		}
	}
	return
}
