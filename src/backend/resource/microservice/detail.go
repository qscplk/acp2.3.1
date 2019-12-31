package microservice

import (
	"github.com/pkg/errors"
	"log"
	"strings"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/network"
	"k8s.io/apimachinery/pkg/runtime/schema"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	client "k8s.io/client-go/kubernetes"
)

type Workload struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type ServiceItem struct {
	Name             string `json:"name"`
	IsCreateBySystem bool   `json:"iscreatebysystem"`
}

// MicroServiceSpec defines the desired state of MicroService
type MicroServiceSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Deployments  []Workload    `json:"deployments,omitempty"`
	Statefulsets []Workload    `json:"statefulsets,omitempty"`
	Daemonsets   []Workload    `json:"daemonsets,omitempty"`
	Services     []ServiceItem `json:"services,omitempty"`
}

type MicroServiceRelation struct {
	Deployment Workload      `json:"deployment,omitempty"`
	Services   []ServiceItem `json:"services,omitempty"`
}

// MicroServiceStatus defines the observed state of MicroService
type MicroServiceStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// MicroService is the Schema for the microservices API
// +k8s:openapi-gen=true
type MicroService struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MicroServiceSpec   `json:"spec,omitempty"`
	Status MicroServiceStatus `json:"status,omitempty"`
}

func setServiceTypeMeta(svc *corev1.Service) {
	svc.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "",
		Version: "v1",
		Kind:    "Service",
	})
}

func setDeploymentTypeMeta(deploy *appsv1.Deployment) {
	deploy.TypeMeta.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "apps",
		Version: "v1",
		Kind:    "Deployment",
	})
}

func GetMicroServiceResource(dyclient dynamic.NamespaceableResourceInterface, namespace, msname string) (*MicroService, error) {
	unstruct, err := dyclient.Namespace(namespace).Get(msname, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	microService, err := GetMicroServiceFromUnstructured(unstruct)
	if err != nil {
		return nil, err
	}

	return microService, nil
}

func CreateMicroServiceSvc(k8sclient client.Interface, dyclient dynamic.NamespaceableResourceInterface, namespace, msname string, spec *corev1.Service) (*corev1.Service, error) {
	//get ms resource
	microService, err := GetMicroServiceResource(dyclient, namespace, msname)
	if err != nil {
		return nil, err
	}

	svcExist := false
	for _, svcitem := range microService.Spec.Services {
		if svcitem.Name == spec.ObjectMeta.Name {
			svcExist = true
			break
		}
	}

	//if already exist , return already exist error
	if svcExist {
		return nil, errors.New("the svc name is same in microservice")
	}

	//create svc first, then add to crd, can not add crd first while controller will delete svc if not exist
	service, err := k8sclient.CoreV1().Services(namespace).Create(spec)
	if err != nil {
		return nil, err
	}
	setServiceTypeMeta(service)

	//controller will watch svc ,and set them deployment to the svc selector label
	svcitem := ServiceItem{
		Name:             service.ObjectMeta.Name,
		IsCreateBySystem: true,
	}
	microService.Spec.Services = append(microService.Spec.Services, svcitem)
	msus, err := GetUnstructuredFromMicroService(microService)
	if err != nil {
		//if failed del svc
		_ = k8sclient.CoreV1().Services(namespace).Delete(spec.ObjectMeta.Name, &metav1.DeleteOptions{})
		return nil, err
	}

	_, err = dyclient.Namespace(namespace).Update(msus, metav1.UpdateOptions{})
	if err != nil {
		//if failed ,del svc
		_ = k8sclient.CoreV1().Services(namespace).Delete(spec.ObjectMeta.Name, &metav1.DeleteOptions{})
		return nil, err
	}

	return service, nil
}

func DeleteDeploymentSelectorLabel(deployment *appsv1.Deployment, labelmap map[string]string, k8sclient client.Interface) error {
	//deployment exist ,go on to deal
	modified := false
	//label may be nil
	if deployment.Spec.Template.ObjectMeta.Labels == nil {
		return nil
	}

	for k, _ := range labelmap {
		if _, ok := deployment.Spec.Template.ObjectMeta.Labels[k]; ok {
			delete(deployment.Spec.Template.ObjectMeta.Labels, k)
			modified = true
		}
	}

	if modified {
		_, err := k8sclient.AppsV1().Deployments(deployment.ObjectMeta.Namespace).Update(deployment)
		if err != nil {
			return errors.WithStack(err)
		}
	}
	return nil
}

func DeleteOldServiceLabelWithDeployments(namespace, svcname string, k8sclient client.Interface, spec *corev1.Service) error {
	service, err := k8sclient.CoreV1().Services(namespace).Get(svcname, api.GetOptionsInCache)
	if err != nil {
		//get no deploy then do continue
		return err
	}
	setServiceTypeMeta(service)

	existdeploymentNames := spec.ObjectMeta.Annotations[MicroServiceDeploymentAnnotation]
	existDeployMap := make(map[string]bool)
	if existdeploymentNames != "" {
		existdeploymentNameList := strings.Split(existdeploymentNames, ",")
		for _, deploymentName := range existdeploymentNameList {
			existDeployMap[deploymentName] = true
		}
	}

	deploymentNames := service.ObjectMeta.Annotations[MicroServiceDeploymentAnnotation]
	if deploymentNames != "" {
		deploymentNameList := strings.Split(deploymentNames, ",")
		for _, deploymentName := range deploymentNameList {
			//if dep in the exist map ,do not delete
			if _, ok := existDeployMap[deploymentName]; ok {
				continue
			}
			deployment, err := k8sclient.AppsV1().Deployments(namespace).Get(deploymentName, api.GetOptionsInCache)
			if err != nil {
				//get no deploy then do continue
				continue
			}
			setDeploymentTypeMeta(deployment)

			err = DeleteDeploymentSelectorLabel(deployment, service.Spec.Selector, k8sclient)
			if err != nil {
				return errors.WithStack(err)
			}
		}
	}
	return nil
}

func SetDeploymentSelectorLabel(deployment *appsv1.Deployment, labelmap map[string]string, k8sclient client.Interface) error {

	//deployment exist ,go on to deal
	modified := false
	//label may be nil
	if deployment.Spec.Template.ObjectMeta.Labels == nil {
		deployment.Spec.Template.ObjectMeta.Labels = make(map[string]string)
		for k, v := range labelmap {
			deployment.Spec.Template.ObjectMeta.Labels[k] = v
		}
		modified = true
	} else {
		for k, v := range labelmap {
			if deployment.Spec.Template.ObjectMeta.Labels[k] != v {
				deployment.Spec.Template.ObjectMeta.Labels[k] = v
				modified = true
			}
		}
	}

	if modified {
		_, err := k8sclient.AppsV1().Deployments(deployment.ObjectMeta.Namespace).Update(deployment)
		if err != nil {
			return errors.WithStack(err)
		}
	}
	return nil
}

//set every deployment label by service
func SetDeploymentSelectorLabelByAsmCreateService(service *corev1.Service, k8sclient client.Interface) error {
	deploymentNames := service.ObjectMeta.Annotations[MicroServiceDeploymentAnnotation]
	if deploymentNames != "" {
		deploymentNameList := strings.Split(deploymentNames, ",")
		for _, deploymentName := range deploymentNameList {
			deployment, err := k8sclient.AppsV1().Deployments(service.ObjectMeta.Namespace).Get(deploymentName, api.GetOptionsInCache)
			if err != nil {
				//get no deploy then do continue
				continue
			}
			setDeploymentTypeMeta(deployment)
			err = SetDeploymentSelectorLabel(deployment, service.Spec.Selector, k8sclient)
			if err != nil {
				return errors.WithStack(err)
			}
		}
	}

	return nil
}

func UpdateMicroServiceSvc(k8sclient client.Interface, namespace, msname, svcname string, spec *corev1.Service) (*corev1.Service, error) {
	//delete old resource
	err := DeleteOldServiceLabelWithDeployments(namespace, svcname, k8sclient, spec)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	err = SetDeploymentSelectorLabelByAsmCreateService(spec, k8sclient)
	if err != nil {
		return nil, err
	}
	//controller will watch svc ,and set the new deployment to the svc selector label

	//create svc first, then add to crd, can not add crd first while controller will delete svc if not exist
	service, err := k8sclient.CoreV1().Services(namespace).Update(spec)
	if err != nil {
		return nil, err
	}
	setServiceTypeMeta(service)
	return service, nil
}

func GetMicroServiceRelationDetail(k8sclient client.Interface, dyclient dynamic.NamespaceableResourceInterface, dsQuery *dataselect.DataSelectQuery, namespace string, name string) ([]MicroServiceRelation, error) {
	//get ms resource
	microService, err := GetMicroServiceResource(dyclient, namespace, name)
	if err != nil {
		return nil, err
	}

	//get all svc  or get only labeled svc
	listOptions := common.ConvertToListOptions(dsQuery)
	var svclist *corev1.ServiceList
	if listOptions.LabelSelector != "" {
		svclist = &corev1.ServiceList{}
		for _, msSvc := range microService.Spec.Services {
			svc, err := k8sclient.CoreV1().Services(namespace).Get(msSvc.Name,metav1.GetOptions{})
			if err != nil {
				return nil, err
			}
			svclist.Items= append(svclist.Items,*svc)
		}
	} else {
		svclist, err = k8sclient.CoreV1().Services(namespace).List(metav1.ListOptions{})
		if err != nil {
			return nil, err
		}
	}

	if svclist != nil && svclist.Items != nil {
		for x := range svclist.Items {
			setServiceTypeMeta(&(svclist.Items[x]))
		}
	}

	deploySvcRelations := make([]MicroServiceRelation, 0)
	for _, msDeployment := range microService.Spec.Deployments {
		//analyse svc and deployment
		deployment, err := k8sclient.AppsV1().Deployments(namespace).Get(msDeployment.Name, api.GetOptionsInCache)
		if err != nil {
			//get no deploy then do continue
			continue
		}
		log.Printf("get deployment  is %s ", msDeployment.Name)
		netWorkResources, err := network.GetNetworkResources(deployment.Spec.Template.Spec.Containers, nil, svclist.Items, namespace, deployment.Spec.Template.ObjectMeta.Labels)
		if err != nil {
			return nil, err
		}
		log.Printf("get netWorkResources  is %+v ", netWorkResources)
		svcNamelist := make([]ServiceItem, 0, len(netWorkResources))
		svcNameMap := make(map[string]bool)
		for _, d := range netWorkResources {
			isCreateBySystem := false
			if d.GetLabels() != nil {
				if d.GetLabels()[MicroServiceCreatorLabel] == ASMCREATERESOURCE {
					isCreateBySystem = true
				}
			}
			svcNameMap[d.GetName()] = isCreateBySystem
		}
		for k, v := range svcNameMap {
			svcitem := ServiceItem{
				Name:             k,
				IsCreateBySystem: v,
			}
			svcNamelist = append(svcNamelist, svcitem)
		}
		microServiceRelation := MicroServiceRelation{
			Deployment: msDeployment,
			Services:   svcNamelist,
		}
		deploySvcRelations = append(deploySvcRelations, microServiceRelation)
	}

	return deploySvcRelations, nil
}
