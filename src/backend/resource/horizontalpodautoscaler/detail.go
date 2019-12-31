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

package horizontalpodautoscaler

import (
	"fmt"
	"log"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	autoscaling "k8s.io/api/autoscaling/v2beta1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	client "k8s.io/client-go/kubernetes"
)

// HorizontalPodAutoscalerDetail provides the presentation layer view of Kubernetes Horizontal Pod Autoscaler resource.
// close mapping of the autoscaling.HorizontalPodAutoscaler type with part of the *Spec and *Detail childs
type HorizontalPodAutoscalerDetail struct {
	ObjectMeta      api.ObjectMeta                                 `json:"objectMeta"`
	TypeMeta        api.TypeMeta                                   `json:"typeMeta"`
	AppName         string                                         `json:"appName"`
	ScaleTargetRef  ScaleTargetRef                                 `json:"scaleTargetRef"`
	MinReplicas     *int32                                         `json:"minReplicas"`
	MaxReplicas     int32                                          `json:"maxReplicas"`
	CurrentReplicas int32                                          `json:"currentReplicas"`
	DesiredReplicas int32                                          `json:"desiredReplicas"`
	LastScaleTime   *metaV1.Time                                   `json:"lastScaleTime"`
	Metrics         []autoscaling.MetricSpec                       `json:"metrics"`
	CurrentMetrics  []autoscaling.MetricStatus                     `json:"currentMetrics"`
	Conditions      []autoscaling.HorizontalPodAutoscalerCondition `json:"conditions"`
}

const (
	CpuHorizontalPodAutoscaler    = "cpu"
	MemoryHorizontalPodAutoscaler = "memory"
)

func GetHorizontalPodAutoscalerDetail(client client.Interface, appCoreClient *appCore.ApplicationClient, namespace string, name string) (*HorizontalPodAutoscalerDetail, *autoscaling.HorizontalPodAutoscaler, error) {
	log.Printf("GetHorizontalPodAutoscalerDetail of %s horizontal pod autoscaler", name)

	rawHorizontalPodAutoscaler, err := client.AutoscalingV2beta1().HorizontalPodAutoscalers(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, nil, err
	}
	setTypeMeta(rawHorizontalPodAutoscaler)

	horizontalPodAutoscalerDetail, err := gerneateHorizontalPodAutoscalerDetail(rawHorizontalPodAutoscaler, appCoreClient)
	if err != nil {
		return nil, nil, err
	}

	return horizontalPodAutoscalerDetail, rawHorizontalPodAutoscaler, nil

}

func gerneateHorizontalPodAutoscalerDetail(horizontalPodAutoscaler *autoscaling.HorizontalPodAutoscaler, appCoreClient *appCore.ApplicationClient) (*HorizontalPodAutoscalerDetail, error) {

	uns, err := common.ConvertResourceToUnstructured(horizontalPodAutoscaler)
	if err != nil {
		return nil, err
	}

	details := &HorizontalPodAutoscalerDetail{
		ObjectMeta: api.NewObjectMeta(horizontalPodAutoscaler.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindHorizontalPodAutoscaler),
		AppName:    appCoreClient.FindApplicationName(common.GetLocalBaseDomain(), uns),

		ScaleTargetRef: ScaleTargetRef{
			Kind:       horizontalPodAutoscaler.Spec.ScaleTargetRef.Kind,
			Name:       horizontalPodAutoscaler.Spec.ScaleTargetRef.Name,
			APIVersion: horizontalPodAutoscaler.Spec.ScaleTargetRef.APIVersion,
		},
		MinReplicas:     horizontalPodAutoscaler.Spec.MinReplicas,
		MaxReplicas:     horizontalPodAutoscaler.Spec.MaxReplicas,
		CurrentReplicas: horizontalPodAutoscaler.Status.CurrentReplicas,
		DesiredReplicas: horizontalPodAutoscaler.Status.DesiredReplicas,

		LastScaleTime:  horizontalPodAutoscaler.Status.LastScaleTime,
		Metrics:        horizontalPodAutoscaler.Spec.Metrics,
		CurrentMetrics: horizontalPodAutoscaler.Status.CurrentMetrics,
		Conditions:     horizontalPodAutoscaler.Status.Conditions,
	}

	return details, nil
}

func DeleteHorizontalPodAutoscaler(client client.Interface, appCoreClient *appCore.ApplicationClient, namespace string, name string) error {

	_, rawHorizontalPodAutoscaler, err := GetHorizontalPodAutoscalerDetail(client, appCoreClient, namespace, name)
	setTypeMeta(rawHorizontalPodAutoscaler)
	if err != nil {
		return err
	}

	err = common.DeleteResourceFromApplication(appCoreClient, rawHorizontalPodAutoscaler,
		namespace)
	if err != nil {
		return err
	}
	return err
}

func generateHpaName(name string, id string) string {

	return fmt.Sprintf("%s-%s", name, id)
}

func CreateHorizontalPodAutoscaler(client client.Interface, appCoreClient *appCore.ApplicationClient, namespace string, spec *HorizontalPodAutoscalerDetail) (*HorizontalPodAutoscalerDetail, error) {

	if spec.MinReplicas == nil {
		*spec.MinReplicas = 1 //default val
	}

	id, err := common.GetUUID()
	if err != nil {
		return nil, err
	}
	spec.ObjectMeta.Name = generateHpaName(spec.ScaleTargetRef.Name, id)

	horizontalPodAutoscaler := &autoscaling.HorizontalPodAutoscaler{
		ObjectMeta: metaV1.ObjectMeta{
			Name:        spec.ObjectMeta.Name,
			Namespace:   namespace,
			Annotations: spec.ObjectMeta.Annotations,
		},
		Spec: autoscaling.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscaling.CrossVersionObjectReference{
				Kind:       spec.ScaleTargetRef.Kind,
				Name:       spec.ScaleTargetRef.Name,
				APIVersion: spec.ScaleTargetRef.APIVersion,
			},
			MinReplicas: spec.MinReplicas,
			MaxReplicas: spec.MaxReplicas,
			Metrics:     spec.Metrics,
		},
	}
	setTypeMeta(horizontalPodAutoscaler)

	err = common.CreateResourceAndIpmortToApplication(appCoreClient, horizontalPodAutoscaler,
		namespace, spec.AppName)
	if err != nil {
		return nil, err
	}
	horizontalPodAutoscalerDetail, _, err := GetHorizontalPodAutoscalerDetail(client, appCoreClient, namespace, spec.ObjectMeta.Name)
	if err != nil {
		return nil, err
	}

	return horizontalPodAutoscalerDetail, err
}

func UpdateHorizontalPodAutoscaler(client client.Interface, appCoreClient *appCore.ApplicationClient, namespace, name string, spec *HorizontalPodAutoscalerDetail) (*HorizontalPodAutoscalerDetail, error) {

	horizontalPodAutoscalerDetail, oldrawHorizontalPodAutoscaler, err := GetHorizontalPodAutoscalerDetail(client, appCoreClient, namespace, name)
	if err != nil {
		return nil, err
	}

	if spec.MinReplicas == nil {
		*spec.MinReplicas = 1 //default val
	}

	newMeta := api.NewRawObjectMeta(spec.ObjectMeta)
	oldrawHorizontalPodAutoscaler.ObjectMeta = api.CompleteMeta(newMeta, oldrawHorizontalPodAutoscaler.ObjectMeta)
	oldrawHorizontalPodAutoscaler.Spec.ScaleTargetRef.Kind = spec.ScaleTargetRef.Kind
	oldrawHorizontalPodAutoscaler.Spec.ScaleTargetRef.Name = spec.ScaleTargetRef.Name
	oldrawHorizontalPodAutoscaler.Spec.ScaleTargetRef.APIVersion = spec.ScaleTargetRef.APIVersion
	oldrawHorizontalPodAutoscaler.Spec.MinReplicas = spec.MinReplicas
	oldrawHorizontalPodAutoscaler.Spec.MaxReplicas = spec.MaxReplicas
	oldrawHorizontalPodAutoscaler.Spec.Metrics = spec.Metrics

	setTypeMeta(oldrawHorizontalPodAutoscaler)

	err = common.UpdateResourceWithApplication(appCoreClient, oldrawHorizontalPodAutoscaler, namespace, horizontalPodAutoscalerDetail.AppName)
	if err != nil {
		return nil, err
	}

	horizontalPodAutoscalerDetail, _, err = GetHorizontalPodAutoscalerDetail(client, appCoreClient, namespace, name)
	if err != nil {
		return nil, err
	}

	return horizontalPodAutoscalerDetail, err
}
