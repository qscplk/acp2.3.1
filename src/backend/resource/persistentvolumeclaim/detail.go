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

package persistentvolumeclaim

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

// PersistentVolumeClaimDetail provides the presentation layer view of Kubernetes Persistent Volume Claim resource.
type PersistentVolumeClaimDetail struct {
	ObjectMeta   api.ObjectMeta                  `json:"objectMeta"`
	TypeMeta     api.TypeMeta                    `json:"typeMeta"`
	AppName      string                          `json:"appName"`
	Status       v1.PersistentVolumeClaimPhase   `json:"status"`
	Volume       string                          `json:"volume"`
	Capacity     v1.ResourceList                 `json:"capacity"`
	AccessModes  []v1.PersistentVolumeAccessMode `json:"accessModes"`
	StorageClass *string                         `json:"storageClass"`
}

// GetPersistentVolumeClaimDetail returns detailed information about a persistent volume claim
func GetPersistentVolumeClaimDetail(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, name string) (*PersistentVolumeClaimDetail, error, *v1.PersistentVolumeClaim) {
	log.Printf("Getting details of %s persistent volume claim", name)

	rawPersistentVolumeClaim, err := client.CoreV1().PersistentVolumeClaims(namespace).Get(name, api.GetOptionsInCache)

	if err != nil {
		return nil, err, nil
	}
	setTypeMeta(rawPersistentVolumeClaim)

	details, err := getPersistentVolumeClaimDetailAndAppName(rawPersistentVolumeClaim, appCoreClient)
	if err != nil {
		return nil, err, nil
	}

	return details, nil, rawPersistentVolumeClaim
}

func getPersistentVolumeClaimDetailAndAppName(rawPersistentVolumeClaim *v1.PersistentVolumeClaim, appCoreClient *appCore.ApplicationClient) (*PersistentVolumeClaimDetail, error) {

	rawPersistentVolumeClaim.Kind = api.ResourceKindPersistentVolumeClaim
	rawPersistentVolumeClaim.APIVersion = "v1"
	uns, err := common.ConvertResourceToUnstructured(rawPersistentVolumeClaim)
	if err != nil {
		return nil, err
	}

	details := &PersistentVolumeClaimDetail{
		ObjectMeta:   api.NewObjectMeta(rawPersistentVolumeClaim.ObjectMeta),
		TypeMeta:     api.NewTypeMeta(api.ResourceKindPersistentVolumeClaim),
		AppName:      appCoreClient.FindApplicationName(common.GetLocalBaseDomain(), uns),
		Status:       rawPersistentVolumeClaim.Status.Phase,
		Volume:       rawPersistentVolumeClaim.Spec.VolumeName,
		Capacity:     rawPersistentVolumeClaim.Status.Capacity,
		AccessModes:  rawPersistentVolumeClaim.Spec.AccessModes,
		StorageClass: rawPersistentVolumeClaim.Spec.StorageClassName,
	}

	return details, nil
}

func DeletePersistentVolumeClaim(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, name string) error {

	detailPvc, err, originPvc := GetPersistentVolumeClaimDetail(client, appCoreClient, namespace, name)
	setTypeMeta(originPvc)

	if detailPvc.AppName != "" {
		return errors.NewForbidden(schema.GroupResource{}, originPvc.GetName(),
			fmt.Errorf("PersistentVolumeClaim '%s' is not allowed to delete if it is relate by app", originPvc.GetName()))
	}

	err = client.CoreV1().PersistentVolumeClaims(namespace).Delete(name, &metaV1.DeleteOptions{})
	if err != nil {
		return err
	}

	return err
}

func CreatePersistentVolumeClaim(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, spec *PersistentVolumeClaimDetail) (*PersistentVolumeClaimDetail, error) {

	reqResources := v1.ResourceRequirements{
		Requests: spec.Capacity,
	}

	pvc := &v1.PersistentVolumeClaim{
		ObjectMeta: metaV1.ObjectMeta{
			Name:        spec.ObjectMeta.Name,
			Namespace:   namespace,
			Annotations: spec.ObjectMeta.Annotations,
		},
		Spec: v1.PersistentVolumeClaimSpec{
			VolumeName:       spec.Volume,
			AccessModes:      spec.AccessModes,
			StorageClassName: spec.StorageClass,
			Resources:        reqResources,
		},
	}
	setTypeMeta(pvc)

	var newPvc *v1.PersistentVolumeClaim
	var err error

	if spec.AppName == "" {
		newPvc, err = client.CoreV1().PersistentVolumeClaims(namespace).Create(pvc)
		if err != nil {
			return nil, err
		}
	} else {
		err = common.CreateResourceAndIpmortToApplication(appCoreClient, pvc,
			namespace, spec.AppName)
		if err != nil {
			return nil, err
		}
		_, err, newPvc = GetPersistentVolumeClaimDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
		if err != nil {
			return nil, err
		}
	}

	details := &PersistentVolumeClaimDetail{
		ObjectMeta:   api.NewObjectMeta(newPvc.ObjectMeta),
		TypeMeta:     api.NewTypeMeta(api.ResourceKindPersistentVolumeClaim),
		AppName:      spec.AppName,
		Status:       newPvc.Status.Phase,
		Volume:       newPvc.Spec.VolumeName,
		Capacity:     newPvc.Status.Capacity,
		AccessModes:  newPvc.Spec.AccessModes,
		StorageClass: newPvc.Spec.StorageClassName,
	}

	return details, err
}

func updatePersistentVolumeClaimWithNoNewAppName(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, oldAppName, namespace string, pvc *v1.PersistentVolumeClaim) error {

	err := common.RemoveResourceFromApplication(appCoreClient, pvc,
		namespace, oldAppName)
	if err != nil {
		return err
	}

	_, err = client.CoreV1().PersistentVolumeClaims(namespace).Update(pvc)
	if err != nil {
		return err
	}
	return nil
}

func updatePersistentVolumeClaimWithAppNameChange(appCoreClient *appCore.ApplicationClient, oldAppName, newAppName, namespace string, pvc *v1.PersistentVolumeClaim) error {

	err := common.RemoveResourceFromApplication(appCoreClient, pvc,
		namespace, oldAppName)
	if err != nil {
		return err
	}

	err = common.UpdateResourceWithApplication(appCoreClient, pvc,
		namespace, newAppName)
	if err != nil {
		return err
	}
	return nil
}

func UpdatePersistentVolumeClaim(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, namespace string, spec *PersistentVolumeClaimDetail) (*PersistentVolumeClaimDetail, error) {

	oldPvcDetail, err, pvc := GetPersistentVolumeClaimDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	newMeta := api.NewRawObjectMeta(spec.ObjectMeta)
	pvc.ObjectMeta = api.CompleteMeta(newMeta, pvc.ObjectMeta)
	setTypeMeta(pvc)

	if oldPvcDetail.AppName != "" && spec.AppName != "" && spec.AppName == oldPvcDetail.AppName {
		//old hava val,new have val, and same,update use appcore api
		err = common.UpdateResourceWithApplication(appCoreClient, pvc, namespace, spec.AppName)
	} else if oldPvcDetail.AppName != "" && spec.AppName != "" && spec.AppName != oldPvcDetail.AppName {
		//appName change ,remove old ,update use appcore api
		err = updatePersistentVolumeClaimWithAppNameChange(appCoreClient, oldPvcDetail.AppName, spec.AppName, namespace, pvc)

	} else if oldPvcDetail.AppName != "" && spec.AppName == "" {
		// old have val,new no val ,remove old ,origin update new
		err = updatePersistentVolumeClaimWithNoNewAppName(client, appCoreClient, oldPvcDetail.AppName, namespace, pvc)

	} else if oldPvcDetail.AppName == "" && spec.AppName != "" {
		//old no value,new have val
		err = common.UpdateResourceWithApplication(appCoreClient, pvc,
			namespace, spec.AppName)
	} else if oldPvcDetail.AppName == "" && spec.AppName == "" {
		//old no val,new no val,use origin api
		_, err = client.CoreV1().PersistentVolumeClaims(namespace).Update(pvc)
	} else {
		err = nil
	}

	if err != nil {
		return nil, err
	}

	_, err, newPvc := GetPersistentVolumeClaimDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	details := &PersistentVolumeClaimDetail{
		ObjectMeta:   api.NewObjectMeta(newPvc.ObjectMeta),
		TypeMeta:     api.NewTypeMeta(api.ResourceKindPersistentVolumeClaim),
		Status:       newPvc.Status.Phase,
		Volume:       newPvc.Spec.VolumeName,
		Capacity:     newPvc.Status.Capacity,
		AccessModes:  newPvc.Spec.AccessModes,
		StorageClass: newPvc.Spec.StorageClassName,
	}

	return details, err
}
