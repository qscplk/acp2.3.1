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

package deployment

import (
	goErrors "errors"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	hpa "alauda.io/diablo/src/backend/resource/horizontalpodautoscaler"
	"alauda.io/diablo/src/backend/resource/ingress"
	"alauda.io/diablo/src/backend/resource/network"
	"alauda.io/diablo/src/backend/resource/service"
	"fmt"
	apps "k8s.io/api/apps/v1"
	autoscaling "k8s.io/api/autoscaling/v2beta1"
	"k8s.io/api/core/v1"
	core "k8s.io/api/core/v1"
	extensions "k8s.io/api/extensions/v1beta1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/intstr"
	client "k8s.io/client-go/kubernetes"
)

// RollingUpdateStrategy is behavior of a rolling update. See RollingUpdateDeployment K8s object.
type RollingUpdateStrategy struct {
	MaxSurge       *intstr.IntOrString `json:"maxSurge"`
	MaxUnavailable *intstr.IntOrString `json:"maxUnavailable"`
}

// StatusInfo struct
type StatusInfo struct {
	// Total number of desired replicas on the deployment
	Replicas int32 `json:"replicas"`

	// Number of non-terminated pods that have the desired template spec
	Updated int32 `json:"updated"`

	// Number of available pods (ready for at least minReadySeconds)
	// targeted by this deployment
	Available int32 `json:"available"`

	// Total number of unavailable pods targeted by this deployment.
	Unavailable int32 `json:"unavailable"`
}

// DeploymentDetail is a presentation layer view of Kubernetes Deployment resource.
type DeploymentDetail struct {
	ObjectMeta                  api.ObjectMeta                        `json:"objectMeta"`
	InjectSidecar               string                                `json:"injectSidecar,omitempty"`
	TypeMeta                    api.TypeMeta                          `json:"typeMeta"`
	PodInfo                     common.PodControllerInfo              `json:"podInfo"`
	Status                      common.ControllerStatus               `json:"status"`
	VisitAddresses              network.VisitAddress                  `json:"visitAddresses"`
	Containers                  []core.Container                      `json:"containers"`
	VolumeInfos                 []common.VolumeInfos                  `json:"volumeInfos"`
	UpdateStrategy              apps.DeploymentStrategy               `json:"updateStrategy"`
	NetworkInfo                 network.NetworkInfo                   `json:"networkInfo"`
	Data                        *apps.Deployment                      `json:"data"`
	ImagePullSecrets            []core.LocalObjectReference           `json:"imagePullSecrets"`
	HorizontalPodAutoscalerList []autoscaling.HorizontalPodAutoscaler `json:"horizontalPodAutoscalerList"`
	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetObjectMeta func
func (detail DeploymentDetail) GetObjectMeta() api.ObjectMeta {
	return detail.ObjectMeta
}

// jude pod container include sidecar inject
func sidecarContainer(podListStruct v1.PodList) bool {
	podList := podListStruct.Items
	for _, pod := range podList {
		for _, container := range pod.Spec.Containers {
			if "istio-proxy" == container.Name {
				return true
			}
		}
	}
	return false
}

// GetDeploymentDetail func
func GetDeploymentDetail(appCoreClient *appCore.ApplicationClient, k8sclient client.Interface, namespace string,
	deploymentName string) (detail *DeploymentDetail, err error) {
	deployment, err := GetDeploymentDetailOriginal(k8sclient, namespace, deploymentName)
	if err != nil {
		return nil, err
	}

	// 取pod值
	matchLabels := deployment.Spec.Selector.MatchLabels
	var labelname string
	for key, value := range matchLabels {
		labelname += key + "=" + value + ","
	}
	if len(labelname) > 0 {
		labelname = string(labelname[0 : len(labelname)-1])
	}
	options := metaV1.ListOptions{LabelSelector: labelname}
	podListStruct, _ := k8sclient.CoreV1().Pods(namespace).List(options)

	isSidecar := sidecarContainer(*podListStruct)
	var podAnnotations string
	if isSidecar {
		podAnnotations = "true"
	} else {
		podAnnotations = "false"
	}

	res, err := common.ConvertResourceToUnstructured(deployment)
	if err != nil {
		return nil, err
	}

	app, err := appCoreClient.FindApplication(common.GetLocalBaseDomain(), res)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return nil, goErrors.New("Find App failed")
	}

	ingresses, err := ingress.GetFormCore(*app)
	if err != nil {
		return nil, err
	}

	services, err := service.GetFormCore(*app)
	if err != nil {
		return nil, err
	}

	rc, nonCriticalErrors, err := common.GetRelationResource(k8sclient, namespace)
	if err != nil {
		return nil, err
	}

	_, err, rc.HorizontalPodAutoscalerList = hpa.GetHorizontalPodAutoscalerListForResource(k8sclient, namespace, api.ResourceKindDeployment, deploymentName)
	if err != nil {
		return nil, err
	}

	rc.Services = services
	rc.Ingresses = ingresses

	return toDeploymentDetail(deployment, rc, nonCriticalErrors, podAnnotations), nil
}

func toDeploymentDetail(deployment *apps.Deployment, rc *common.ResourceCollection, nonCriticalErrors []error, podAnnotations string) (detail *DeploymentDetail) {
	matchPods := common.FilterDeploymentPodsByOwnerReference(*deployment, rc.ReplicaSets, rc.Pods)
	podInfo := common.GetPodControllerInfo(deployment.Status.Replicas, deployment.Spec.Replicas, deployment.GetObjectMeta(), matchPods, rc.Events)
	networkInfo, visitAddresses := network.GetNetworkInfo(deployment.Spec.Template.Spec.Containers, rc.Ingresses, rc.Services, deployment.Namespace, deployment.Spec.Template.Labels)

	detail = &DeploymentDetail{
		ObjectMeta:                  api.NewObjectMeta(deployment.ObjectMeta),
		InjectSidecar:               podAnnotations,
		TypeMeta:                    api.NewTypeMeta(api.ResourceKindDeployment),
		PodInfo:                     podInfo,
		NetworkInfo:                 networkInfo,
		VisitAddresses:              visitAddresses,
		Status:                      common.GetControllerStatus(&podInfo),
		ImagePullSecrets:            deployment.Spec.Template.Spec.ImagePullSecrets,
		Containers:                  deployment.Spec.Template.Spec.Containers,
		VolumeInfos:                 common.GetVolumeInfo(deployment.Spec.Template.Spec.Containers, deployment.Spec.Template.Spec.Volumes),
		UpdateStrategy:              deployment.Spec.Strategy,
		HorizontalPodAutoscalerList: rc.HorizontalPodAutoscalerList,
		Data:                        deployment,
		Errors:                      nonCriticalErrors,
	}
	return
}

// get pod container sidecar situations
func getDeploymentSidecarInject(deployment apps.Deployment, k8sclient client.Interface, app appCore.Application) string {
	// 取pod值
	matchLabels := deployment.Spec.Selector.MatchLabels
	var labelname string
	for key, value := range matchLabels {
		labelname += key + "=" + value + ","
	}
	if len(labelname) > 0 {
		labelname = string(labelname[0 : len(labelname)-1])
	}
	options := metaV1.ListOptions{LabelSelector: labelname}
	podListStruct, _ := k8sclient.CoreV1().Pods(app.GetAppCrd().Namespace).List(options)

	isSidecar := sidecarContainer(*podListStruct)
	var podAnnotations string
	if isSidecar {
		podAnnotations = "true"
	} else {
		podAnnotations = "false"
	}
	return podAnnotations
}

func GenerateDetailFromCore(app appCore.Application, k8sclient client.Interface, rc *common.ResourceCollection) (*[]DeploymentDetail, error) {
	deployments, err := GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.Deployments = deployments
	ingresses, err := ingress.GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.Ingresses = ingresses
	services, err := service.GetFormCore(app)
	if err != nil {
		return nil, err
	}
	rc.Services = services

	ddlist := make([]DeploymentDetail, 0, len(deployments))
	for _, d := range deployments {
		_, err, rc.HorizontalPodAutoscalerList = hpa.GetHorizontalPodAutoscalerListForResource(k8sclient, d.ObjectMeta.Namespace, api.ResourceKindDeployment, d.ObjectMeta.Name)
		if err != nil {
			return nil, err
		}
		podAnnotations := getDeploymentSidecarInject(d, k8sclient, app)
		dd := toDeploymentDetail(&d, rc, make([]error, 0), podAnnotations)
		ddlist = append(ddlist, *dd)
	}
	return &ddlist, nil
}

// DeploymentSpec struct
type DeploymentSpec struct {
	ObjectMeta       api.ObjectMeta              `json:"objectMeta"`
	InjectSidecar    string                      `json:"injectSidecar"`
	TypeMeta         api.TypeMeta                `json:"typeMeta"`
	Replicas         int32                       `json:"replicas"`
	Containers       []core.Container            `json:"containers"`
	VolumeInfos      []common.VolumeInfos        `json:"volumeInfos"`
	NetworkInfo      network.NetworkInfo         `json:"networkInfo"`
	ImagePullSecrets []core.LocalObjectReference `json:"imagePullSecrets"`
}

type DeploymentResult struct {
	Resources *[]unstructured.Unstructured
	Result    *appCore.Result `json:"result"`
}

func UpdateDeployment(appCoreClient *appCore.ApplicationClient, k8sclient client.Interface, namespace, name string, spec DeploymentSpec, isDryRun bool) (*DeploymentResult, error) {
	deployment, err := GetDeploymentDetailOriginal(k8sclient, namespace, name)
	if err != nil {
		return nil, err
	}

	deployUnstr, err := common.ConvertResourceToUnstructured(deployment)
	if err != nil {
		return nil, err
	}

	app, err := appCoreClient.FindApplication(common.GetLocalBaseDomain(), deployUnstr)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return nil, goErrors.New("Find App failed")
	}

	ingresses, err := ingress.GetFormCore(*app)
	if err != nil {
		return nil, err
	}

	services, err := service.GetFormCore(*app)
	if err != nil {
		return nil, err
	}
	oldResources, err := network.GetNetworkResources(deployment.Spec.Template.Spec.Containers, ingresses, services, namespace, deployment.Spec.Selector.MatchLabels)
	if err != nil {
		return nil, err
	}
	oldResources = append(oldResources, *deployUnstr)
	newYamlList, err := GenerateYaml(namespace, spec, deployment)
	if err != nil {
		return nil, err
	}
	// combine the two resource list, when the resource exist in both list
	// use the old resource metadata
	combinedList := common.CombineResourceList(oldResources, newYamlList)
	// remove old deployment resources
	RemovedList := common.RemoveSubList(app.Resources, oldResources)
	// add merged resourcelist to app
	finalList := common.AddSubList(RemovedList, combinedList)
	if isDryRun {
		return &DeploymentResult{
			Resources: &combinedList,
			Result:    nil,
		}, nil
	}
	_, result := appCoreClient.UpdateApplication(namespace, app.GetAppCrd().GetName(), &finalList)
	return &DeploymentResult{
		Resources: &combinedList,
		Result:    result,
	}, nil
}

func updateDeploymentByYaml(appCoreClient *appCore.ApplicationClient, oldYamlMap map[string]*unstructured.Unstructured, newYamlList *[]unstructured.Unstructured, namespace, appName string) error {
	createList := make([]unstructured.Unstructured, 0, 2)
	deleteList := make([]appCore.GVKName, 0, 2)
	updateList := make([]unstructured.Unstructured, 0, 2)
	for _, yaml := range *newYamlList {
		key := common.GetKeyOfUnstructured(&yaml)
		if oldYamlMap[key] != nil {
			updateList = append(updateList, yaml)
			oldYamlMap[key] = nil
		} else {
			createList = append(createList, yaml)
		}

	}

	for _, yaml := range oldYamlMap {
		if yaml != nil {
			deleteList = append(deleteList, appCore.NewGVKName(yaml.GroupVersionKind(), yaml.GetName()))
		}
	}
	return updateAppByList(appCoreClient, createList, updateList, deleteList, namespace, appName)
}

// GenerateYaml func
func GenerateYaml(namespace string, spec DeploymentSpec, oldDeployment *apps.Deployment) (yamlList []unstructured.Unstructured, err error) {
	listLength := len(spec.NetworkInfo.InternalNetworkInfos) + 2*len(spec.NetworkInfo.ExternalNetworkInfos) + 1
	yamlList = make([]unstructured.Unstructured, 0, listLength)
	yaml, err := generateDeployYaml(namespace, spec, oldDeployment)
	if err != nil {
		return
	}
	yamlList = append(yamlList, *yaml)
	deploy, _ := ConverToOriginal(yaml)
	// add network resource
	networkYamlList, err := network.GenerateYaml(spec.NetworkInfo, namespace, deploy.Spec.Selector.MatchLabels, spec.InjectSidecar)
	for _, yaml := range networkYamlList {
		yamlList = append(yamlList, yaml)
	}

	return yamlList, nil
}

func generateDeployYaml(namespace string, spec DeploymentSpec, oldDeployment *apps.Deployment) (*unstructured.Unstructured, error) {
	var newDeploy *apps.Deployment
	if oldDeployment == nil || oldDeployment.GetName() == "" {
		newDeploy = createNewDeploymentYaml(namespace, spec)
	} else {
		newDeploy = createUpdatedDeployementYaml(namespace, spec, oldDeployment)
	}
	for index, container := range spec.Containers {
		for _, vi := range spec.VolumeInfos[index] {
			fulfillDeploymentVolumeMount(newDeploy, namespace, container.Name, *vi)
		}
	}

	importvolume := make(map[string]string)

	for _, container := range newDeploy.Spec.Template.Spec.Containers {
		for _, containervolume := range container.VolumeMounts {
			importvolume[containervolume.Name] = "exist"
		}
	}

	// delete the unimport volume
	for i := len(newDeploy.Spec.Template.Spec.Volumes) - 1; i >= 0; i-- {
		if _, ok := importvolume[newDeploy.Spec.Template.Spec.Volumes[i].Name]; !ok {
			newDeploy.Spec.Template.Spec.Volumes = append(newDeploy.Spec.Template.Spec.Volumes[:i], newDeploy.Spec.Template.Spec.Volumes[i+1:]...)
		}
	}

	return common.ConvertResourceToUnstructured(newDeploy)
}

func GetAppNameKey(baseDomain string, prefix string) string {
	if baseDomain == "" {
		baseDomain = appCore.DefaultBaseDomain
	}
	return fmt.Sprintf("%s.%s/name", prefix, baseDomain)
}

func createUpdatedDeployementYaml(namespace string, spec DeploymentSpec, oldDeployment *apps.Deployment) *apps.Deployment {
	// matchlabels不能修改.判断labels存在，且不能更新matchlabels，则过滤掉matchlabels中的这两个标签，其他的需要更新的标签则进行
	appKey := GetAppNameKey(DeploymentNamePrefix, DeploymentApp)
	serviceKey := GetAppNameKey(DeploymentNamePrefix, DeploymentService)
	// 存在需要修改的标签，则更新部分标签
	if len(spec.ObjectMeta.Labels) > 0 {
		for key, value := range spec.ObjectMeta.Labels {
			if key == appKey || key == serviceKey {
				continue
			}
			oldDeployment.ObjectMeta.Labels[key] = value
			oldDeployment.Spec.Template.ObjectMeta.Labels[key] = value
		}
	}
	// add Annotations labels
	if spec.InjectSidecar != "" {
		if oldDeployment.Spec.Template.ObjectMeta.Annotations == nil {
			oldDeployment.Spec.Template.ObjectMeta.Annotations = make(map[string]string)
		}
		oldDeployment.Spec.Template.ObjectMeta.Annotations[DeploymentInjectSidecar] = spec.InjectSidecar
	}

	oldDeployment.Spec.Replicas = &spec.Replicas
	oldDeployment.Spec.Template.Spec.Containers = spec.Containers
	oldDeployment.Spec.Template.Spec.ImagePullSecrets = spec.ImagePullSecrets
	return oldDeployment
}

// set deployment and pods labels
func setSelectorLabels(namespace string, labels map[string]string, spec DeploymentSpec) (map[string]string, map[string]string) {
	matchlabels := make(map[string]string)
	if labels == nil {
		labels = make(map[string]string)
	}
	if _, ok := labels[DeploymentApp]; !ok {
		labels[DeploymentApp] = fmt.Sprintf("%s-%s", DeploymentName, spec.ObjectMeta.Name)
	}
	if _, ok := labels[DeploymentVersion]; !ok {
		labels[DeploymentVersion] = DeploymentDefaultVersion
	}
	appKey := GetAppNameKey(common.GetLocalBaseDomain(), DeploymentApp)
	if _, ok := labels[appKey]; !ok {
		appValue := fmt.Sprintf("%s.%s", spec.ObjectMeta.Name, namespace)
		labels[appKey] = appValue
	}
	serviceKey := GetAppNameKey(common.GetLocalBaseDomain(), DeploymentService)
	if _, ok := labels[serviceKey]; !ok {
		serviceValue := fmt.Sprintf("%s-%s", DeploymentName, spec.ObjectMeta.Name)
		labels[serviceKey] = serviceValue
	}
	for key, value := range labels {
		if key == DeploymentApp || key == DeploymentVersion {
			continue
		}
		matchlabels[key] = value
	}
	return matchlabels, labels
}

func createNewDeploymentYaml(namespace string, spec DeploymentSpec) *apps.Deployment {
	// when the label is empty, auto add pod default labels and deployment labels
	labels := spec.ObjectMeta.Labels
	matchlabels, labels := setSelectorLabels(namespace, labels, spec)
	// add albels named annotations correspond sidecar.istio.io/inject label
	var annotations map[string]string
	if spec.InjectSidecar != "" {
		annotations = make(map[string]string)
		annotations[DeploymentInjectSidecar] = spec.InjectSidecar
	}

	// set Deployment.Metadata ObjectMeta object values
	objectMeta := metaV1.ObjectMeta{
		Name:      spec.ObjectMeta.Name,
		Namespace: namespace,
		Labels:    matchlabels,
	}
	// set Deployment.Metadata TypeMeta object values
	typeMeta := metaV1.TypeMeta{
		Kind:       api.ResourceKindDeployment,
		APIVersion: DeploymentAPIVersion,
	}
	// set Deployment.Spec object values
	deploySpec := apps.DeploymentSpec{
		Replicas: &spec.Replicas,
		Selector: &metaV1.LabelSelector{MatchLabels: matchlabels},
		Template: core.PodTemplateSpec{
			ObjectMeta: metaV1.ObjectMeta{
				Annotations: annotations,
				Labels:      labels,
			},
			Spec: core.PodSpec{
				Containers:       spec.Containers,
				ImagePullSecrets: spec.ImagePullSecrets,
			},
		},
	}

	// set Deployment object values
	deploy := &apps.Deployment{
		ObjectMeta: objectMeta,
		TypeMeta:   typeMeta,
		Spec:       deploySpec,
	}
	return deploy
}

func UpdateNetwork(appCoreClient *appCore.ApplicationClient, k8sclient client.Interface,
	namespace, name string, updateSpec *network.UpdateNetworkSpec) error {
	deployment, err := GetDeploymentDetailOriginal(k8sclient, namespace, name)
	if err != nil {
		return err
	}

	utr, err := common.ConvertResourceToUnstructured(deployment)
	if err != nil {
		return err
	}

	app, err := appCoreClient.FindApplication(common.GetLocalBaseDomain(), utr)
	if err != nil {
		return err
	}

	is, err := ingress.GetFormCore(*app)
	if err != nil {
		return err
	}

	ss, err := service.GetFormCore(*app)
	if err != nil {
		return err
	}

	var ingressName, serviceName string
	if updateSpec.Type == network.TypeExternal && updateSpec.OldExternalNetworkInfo != nil {
		ingressName = updateSpec.OldExternalNetworkInfo.IngressName
		serviceName = updateSpec.OldExternalNetworkInfo.ServiceName
	} else if updateSpec.Type == network.TypeInternal && updateSpec.OldInternalNetworkInfo != nil {
		serviceName = updateSpec.OldInternalNetworkInfo.ServiceName
	} else if updateSpec.Type == network.TypeNodePort && updateSpec.OldExternalNodePortInfo != nil {
		serviceName = updateSpec.OldExternalNodePortInfo.ServiceName
	}

	matchService := getMatchService(serviceName, ss)
	matchIngress := getMatchIngress(ingressName, is)

	yamlList, err := network.UpdateNetworkInfo(matchIngress, matchService, updateSpec, namespace, deployment.Spec.Template.Labels, "")
	if err != nil {
		return err
	}
	return handleUpdateYamlList(yamlList, appCoreClient, namespace, app.GetAppCrd().GetName())
}

func getMatchService(name string, ss []core.Service) *core.Service {
	var matchService *core.Service
	if name == "" {
		return matchService
	}
	for _, s := range ss {
		if s.GetName() == name {
			matchService = &s
			break
		}
	}
	return matchService
}

func getMatchIngress(name string, is []extensions.Ingress) *extensions.Ingress {
	var matchIngress *extensions.Ingress
	if name == "" {
		return matchIngress
	}
	for _, i := range is {
		if i.GetName() == name {
			matchIngress = &i
			break
		}
	}
	return matchIngress
}

func handleUpdateYamlList(yamlList []network.UpdateNetworkYaml, appCoreClient *appCore.ApplicationClient, namespace, appName string) error {
	createList := make([]unstructured.Unstructured, 0, 2)
	deleteList := make([]appCore.GVKName, 0, 2)
	updateList := make([]unstructured.Unstructured, 0, 2)

	for _, yaml := range yamlList {
		switch action := yaml.Action; action {
		case network.ActionCreate:
			createList = append(createList, yaml.Yaml)
		case network.ActionDelete:
			deleteList = append(deleteList, appCore.NewGVKName(yaml.Yaml.GroupVersionKind(), yaml.Yaml.GetName()))
		case network.ActionUpdate:
			updateList = append(updateList, yaml.Yaml)
		}
	}

	return updateAppByList(appCoreClient, createList, updateList, deleteList, namespace, appName)
}

func updateAppByList(appCoreClient *appCore.ApplicationClient, createList []unstructured.Unstructured, updateList []unstructured.Unstructured, deleteList []appCore.GVKName, namespace, appName string) error {
	if len(createList) > 0 {
		_, result := appCoreClient.AddApplicationResources(namespace, appName, &createList)
		if result.CombineError() != nil {
			return result.CombineError()
		}
	}

	if len(deleteList) > 0 {
		_, result := appCoreClient.DeleteApplicationResources(namespace, appName, deleteList)
		if result.CombineError() != nil {
			return result.CombineError()
		}
	}
	if len(updateList) > 0 {
		_, result := appCoreClient.UpdateApplicationResources(namespace, appName, &updateList)
		if result.CombineError() != nil {
			return result.CombineError()
		}
	}
	return nil
}
