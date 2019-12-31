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
	"fmt"
	"log"

	"alauda.io/diablo/src/backend/resource/coderepobinding"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/imageregistrybinding"
	"alauda.io/diablo/src/backend/resource/jenkinsbinding"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	appCore "alauda.io/app-core/pkg/app"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"

	"k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// SecretDetail API resource provides mechanisms to inject containers with configuration data while keeping
// containers agnostic of Kubernetes
type SecretDetail struct {
	ObjectMeta api.ObjectMeta `json:"metadata"`
	TypeMeta   api.TypeMeta   `json:",inline"`

	// Data contains the secret data.  Each key must be a valid DNS_SUBDOMAIN
	// or leading dot followed by valid DNS_SUBDOMAIN.
	// The serialized form of the secret data is a base64 encoded string,
	// representing the arbitrary (possibly non-string) data value here.
	Data map[string][]byte `json:"data"`

	// StringData is without base64 Data
	StringData map[string]string `json:"stringData,omitempty"`

	//AppName mens this resource belongs app name
	AppName string `json:"appName"`

	// Used to facilitate programmatic handling of secret data.
	Type v1.SecretType `json:"type"`
}

type ResourceItem struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Kind      string `json:"kind"`
}

type ResourceList struct {
	Items []ResourceItem `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetSecretDetail returns returns detailed information about a secret
func GetSecretDetail(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace, name string) (*SecretDetail, error, *v1.Secret) {
	log.Printf("Getting details of %s secret in %s namespace\n", name, namespace)

	rawSecret, err := client.CoreV1().Secrets(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err, nil
	}
	setTypeMeta(rawSecret)

	detail, err := getSecretDetailAndAppName(rawSecret, appCoreClient)
	if err != nil {
		return nil, err, nil
	}

	return detail, err, rawSecret
}

func GetSecretRelatedResources(k8sclient kubernetes.Interface, devopsClient devopsclient.Interface, namespace, name string, dsQuery *dataselect.DataSelectQuery) (resoureList *ResourceList, err error) {
	codeRepoBindings, err := coderepobinding.GetCodeRepoBindingList(devopsClient, common.NewSameNamespaceQuery(namespace), dsQuery)
	if err != nil {
		return
	}

	jenkinsBindings, err := jenkinsbinding.GetJenkinsBindingList(devopsClient, k8sclient, common.NewSameNamespaceQuery(namespace), dsQuery)
	if err != nil {
		return
	}

	imageRegistryBindings, err := imageregistrybinding.GetImageRegistryBindingList(devopsClient, common.NewSameNamespaceQuery(namespace), dsQuery)
	if err != nil {
		return
	}

	resourceList := &ResourceList{
		Items: make([]ResourceItem, 0),
	}
	if len(codeRepoBindings.Items) > 0 {
		for _, item := range codeRepoBindings.Items {
			refSecretName := item.Spec.Account.Secret.Name
			refSecretNamespace := item.Spec.Account.Secret.Namespace
			if refSecretName != name || (refSecretNamespace != devopsv1alpha1.NamespaceGlobalCredentials && namespace != refSecretNamespace) {
				continue
			}
			resourceList.Items = append(resourceList.Items, ResourceItem{
				Name:      item.ObjectMeta.Name,
				Namespace: item.ObjectMeta.Namespace,
				Kind:      api.ResourceKindCodeRepoBinding,
			})
		}
	}
	if len(imageRegistryBindings.Items) > 0 {
		for _, item := range imageRegistryBindings.Items {
			refSecretName := item.Spec.Secret.Name
			refSecretNamespace := item.Spec.Secret.Namespace
			if refSecretName != name || (refSecretNamespace != devopsv1alpha1.NamespaceGlobalCredentials && namespace != refSecretNamespace) {
				continue
			}
			resourceList.Items = append(resourceList.Items, ResourceItem{
				Name:      item.ObjectMeta.Name,
				Namespace: item.ObjectMeta.Namespace,
				Kind:      api.ResourceKindImageRegistry,
			})
		}
	}
	if len(jenkinsBindings.Items) > 0 {
		for _, item := range jenkinsBindings.Items {
			refSecretName := item.Spec.Account.Secret.Name
			refSecretNamespace := item.Spec.Account.Secret.Namespace
			if refSecretName != name || (refSecretNamespace != devopsv1alpha1.NamespaceGlobalCredentials && namespace != refSecretNamespace) {
				continue
			}
			resourceList.Items = append(resourceList.Items, ResourceItem{
				Name:      item.ObjectMeta.Name,
				Namespace: item.ObjectMeta.Namespace,
				Kind:      api.ResourceKindJenkinsBinding,
			})
		}
	}
	return resourceList, nil
}

// CreateSecret creates a single secret using the cluster API client
func CreateSecret(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace *common.NamespaceQuery, spec *SecretDetail) (*Secret, error) {
	curNamespace := common.GetCurNamespace(namespace)

	secret := &v1.Secret{
		ObjectMeta: metaV1.ObjectMeta{
			Name:        spec.ObjectMeta.Name,
			Namespace:   curNamespace,
			Annotations: spec.ObjectMeta.Annotations,
		},
		Type:       spec.Type,
		Data:       spec.Data,
		StringData: spec.StringData,
	}
	setTypeMeta(secret)

	var newSecret *v1.Secret
	var err error

	if spec.AppName == "" {
		newSecret, err = client.CoreV1().Secrets(curNamespace).Create(secret)
		if err != nil {
			return nil, err
		}
	} else {
		err = common.CreateResourceAndIpmortToApplication(appCoreClient, secret,
			curNamespace, spec.AppName)
		if err != nil {
			return nil, err
		}
		_, err, newSecret = GetSecretDetail(client, appCoreClient, curNamespace, spec.ObjectMeta.Name)
		if err != nil {
			return nil, err
		}
	}

	return toSecret(newSecret, spec.AppName), err
}

func updateSecretWithNoNewAppName(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, oldAppName, namespace string, secret *v1.Secret) error {

	err := common.RemoveResourceFromApplication(appCoreClient, secret,
		namespace, oldAppName)
	if err != nil {
		return err
	}

	_, err = client.CoreV1().Secrets(namespace).Update(secret)
	if err != nil {
		return err
	}
	return nil
}

func updateSecretWithAppNameChange(appCoreClient *appCore.ApplicationClient, oldAppName, newAppName, namespace string, secret *v1.Secret) error {

	err := common.RemoveResourceFromApplication(appCoreClient, secret,
		namespace, oldAppName)
	if err != nil {
		return err
	}

	err = common.UpdateResourceWithApplication(appCoreClient, secret,
		namespace, newAppName)
	if err != nil {
		return err
	}
	return nil
}

// UpdateSecret updates a single secret using the cluster API client
func UpdateSecret(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace *common.NamespaceQuery, spec *SecretDetail) (*Secret, error) {
	curNamespace := common.GetCurNamespace(namespace)

	oldSercetDetail, err, originSecret := GetSecretDetail(client, appCoreClient, curNamespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	if originSecret.Type == devopsv1alpha1.SecretTypeOAuth2 {
		ownerReferences := originSecret.GetOwnerReferences()
		if ownerReferences != nil && len(ownerReferences) > 1 {
			return nil, errors.NewForbidden(schema.GroupResource{}, originSecret.GetName(),
				fmt.Errorf("secret '%s' is not allowed to update if it is referenced by other resources", originSecret.GetName()))
		}
	}

	anno := common.DevOpsAnnotator{}
	newMeta := api.NewRawObjectMeta(spec.ObjectMeta)
	originSecret.ObjectMeta = anno.GetProductAnnotations(api.CompleteMeta(newMeta, originSecret.ObjectMeta))
	// if new secret data not exist, we do not update the old secret data.
	if spec.Data != nil && len(spec.Data) != 0 {
		originSecret.Data = spec.Data
	}

	if spec.StringData != nil && len(spec.StringData) != 0 {
		originSecret.StringData = spec.StringData
	}

	setTypeMeta(originSecret)

	if oldSercetDetail.AppName != "" && spec.AppName != "" && spec.AppName == oldSercetDetail.AppName {
		//old hava val,new have val, and same,update use appcore api
		err = common.UpdateResourceWithApplication(appCoreClient, originSecret, curNamespace, spec.AppName)
	} else if oldSercetDetail.AppName != "" && spec.AppName != "" && spec.AppName != oldSercetDetail.AppName {
		//appName change ,remove old ,update use appcore api
		err = updateSecretWithAppNameChange(appCoreClient, oldSercetDetail.AppName, spec.AppName, curNamespace, originSecret)

	} else if oldSercetDetail.AppName != "" && spec.AppName == "" {
		// old have val,new no val ,remove old ,origin update new
		err = updateSecretWithNoNewAppName(client, appCoreClient, oldSercetDetail.AppName, curNamespace, originSecret)

	} else if oldSercetDetail.AppName == "" && spec.AppName != "" {
		//old no value,new have val
		err = common.UpdateResourceWithApplication(appCoreClient, originSecret,
			curNamespace, spec.AppName)
	} else if oldSercetDetail.AppName == "" && spec.AppName == "" {
		//old no val,new no val,use origin api
		_, err = client.CoreV1().Secrets(curNamespace).Update(originSecret)
	} else {
		err = nil
	}

	if err != nil {
		return nil, err
	}

	_, err, newSecret := GetSecretDetail(client, appCoreClient, curNamespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	return toSecret(newSecret, spec.AppName), err
}

// DeleteSecret delete a single secret using the cluster API client
func DeleteSecret(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace *common.NamespaceQuery, name string) error {
	curNamespace := common.GetCurNamespace(namespace)

	secretDetail, err, originSecret := GetSecretDetail(client, appCoreClient, curNamespace, name)
	setTypeMeta(originSecret)

	if secretDetail.AppName != "" {
		return errors.NewForbidden(schema.GroupResource{}, originSecret.GetName(),
			fmt.Errorf("secret '%s' is not allowed to delete if it is relate by app", originSecret.GetName()))
	}

	err = client.CoreV1().Secrets(curNamespace).Delete(name, &metaV1.DeleteOptions{})
	if err != nil {
		return err
	}

	return nil
}

func getSecretDetailAndAppName(rawSecret *v1.Secret, appCoreClient *appCore.ApplicationClient) (*SecretDetail, error) {
	//rawSecret.Kind = api.ResourceKindSecret
	uns, err := common.ConvertResourceToUnstructured(rawSecret)
	if err != nil {
		return nil, err
	}

	details := &SecretDetail{
		ObjectMeta: api.NewObjectMeta(rawSecret.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindSecret),
		Data:       rawSecret.Data,
		StringData: rawSecret.StringData,
		AppName:    appCoreClient.FindApplicationName(common.GetLocalBaseDomain(), uns),
		Type:       rawSecret.Type,
	}

	if rawSecret.GetNamespace() == devopsv1alpha1.NamespaceGlobalCredentials {
		if details.ObjectMeta.Annotations == nil {
			details.ObjectMeta.Annotations = make(map[string]string, 0)
		}
		details.ObjectMeta.Annotations[devopsv1alpha1.LabelDevopsAlaudaIOGlobalKey] = devopsv1alpha1.TrueString
	}
	return details, nil
}

func OAuthCallback(client devopsclient.Interface, k8sclient kubernetes.Interface,
	namespace, secretNamespace, secretName, serviceName, code string) error {
	log.Printf("oauth callback, namespace: %s; secretName: %s/%s; serviceName: %s; code: %s", namespace, secretNamespace, secretName, serviceName, code)
	var (
		hasCodeRepoService bool
		service            *devopsv1alpha1.CodeRepoService
		secret, secretCopy *v1.Secret
		err                error
		controller         = false
		blockOwnerDeletion = false
	)

	if code == "" {
		return fmt.Errorf("oauth2 callback url does not include the param 'code'")
	}

	service, err = client.DevopsV1alpha1().CodeRepoServices().Get(serviceName, api.GetOptionsInCache)
	if err != nil {
		return err
	}

	secret, err = k8sclient.CoreV1().Secrets(secretNamespace).Get(secretName, api.GetOptionsInCache)
	if err != nil {
		return err
	}
	secretCopy = secret.DeepCopy()

	ownerReferences := secretCopy.GetOwnerReferences()
	if ownerReferences != nil && len(ownerReferences) > 0 {
		for _, ref := range ownerReferences {
			if ref.Kind == devopsv1alpha1.TypeCodeRepoService && ref.Name == serviceName {
				hasCodeRepoService = true
				break
			}
		}
	}

	if !hasCodeRepoService {
		log.Printf("add service '%s' to ownerReferences in secret '%s/%s'", serviceName, secretNamespace, secretName)
		ownerReferences = make([]metaV1.OwnerReference, 0)
		ownerReferences = append(ownerReferences, metaV1.OwnerReference{
			APIVersion:         devopsv1alpha1.APIVersionV1Alpha1,
			Kind:               devopsv1alpha1.TypeCodeRepoService,
			UID:                service.GetUID(),
			Name:               service.GetName(),
			Controller:         &controller,
			BlockOwnerDeletion: &blockOwnerDeletion,
		})
		secretCopy.SetOwnerReferences(ownerReferences)
	}

	if secretCopy.StringData == nil {
		secretCopy.StringData = make(map[string]string, 0)
	}

	secretCopy.StringData[devopsv1alpha1.OAuth2CodeKey] = code
	_, err = k8sclient.CoreV1().Secrets(secretNamespace).Update(secretCopy)
	return err
}
