package microservicesenvironment

import (
	"errors"
	"log"

	catalogv1alpha1 "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
	catalogclient "catalog-controller/pkg/client/clientset/versioned"

	asfClient "alauda.io/diablo/src/backend/client/asf"
	alaudaErrors "alauda.io/diablo/src/backend/errors"

	"alauda.io/diablo/src/backend/api"
	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
)

// MicroservicesEnvironmentDetail sets a definition for applicationdetail
type MicroservicesEnvironmentDetail struct {
	MicroservicesEnvironment *MicroservicesEnvironment         `json:"microservicesEnvironment"`
	MicroservicesComponents  []MicroservicesComponentListItem  `json:"microservicesComponents"`
	MicroserviceBindings     []MicroservicesEnvironmentBinding `json:"microservicesEnvironmentBindings"`
}

type MicroservicesEnvironment struct {
	ObjectMeta      api.ObjectMeta                           `json:"objectMeta"`
	TypeMeta        api.TypeMeta                             `json:"typeMeta"`
	BindingProjects *[]BindingProject                        `json:"bindingProjects,omitempty"`
	Spec            asfClient.MicroservicesEnvironmentSpec   `json:"spec"`
	Status          asfClient.MicroservicesEnvironmentStatus `json:"status"`
}

type MicroservicesEnvironmentBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   asfClient.MicroservicesEnvironmentBindingSpec   `json:"spec,omitempty"`
	Status asfClient.MicroservicesEnvironmentBindingStatus `json:"status,omitempty"`
}

type BindingProject struct {
	Name string `json:"name"`
}
type MicroservicesComponentListItem struct {
	MicroservicesComponent MicroservicesComponent `json:"microservicesComponent"`
	Chart                  Chart                  `json:"chart"`
}
type MicroservicesComponent struct {
	ObjectMeta api.ObjectMeta                         `json:"objectMeta"`
	TypeMeta   api.TypeMeta                           `json:"typeMeta"`
	Spec       asfClient.MicroservicesComponentSpec   `json:"spec"`
	Status     asfClient.MicroservicesComponentStatus `json:"status"`
}

type Chart struct {
	ObjectMeta api.ObjectMeta              `json:"objectMeta"`
	TypeMeta   api.TypeMeta                `json:"typeMeta"`
	Spec       ChartBasicInfo              `json:"spec"`
	Status     catalogv1alpha1.ChartStatus `json:"status"`
}

type ChartBasicInfo struct {
	Values    string                           `json:"values"`
	ValueJson []catalogv1alpha1.ChartSpecValue `json:"valueJson,omitempty"`
}

func GetMicroservicesEnvironmentDetail(client asfClient.AsfV1alpha1Interface, k8sclient kubernetes.Interface, catalogclient catalogclient.Interface, name string) (msenvDetail *MicroservicesEnvironmentDetail, err error) {
	var msEnv *asfClient.MicroservicesEnvironment

	msenvDetail = &MicroservicesEnvironmentDetail{
		MicroserviceBindings: make([]MicroservicesEnvironmentBinding, 0),
	}

	msEnv, err = client.MicroservicesEnvironments().Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Println("error while get microservice environments detail", err)

	}
	_, criticalError := alaudaErrors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	msenvDetail.MicroservicesEnvironment = &MicroservicesEnvironment{
		ObjectMeta: api.NewObjectMeta(msEnv.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindMicroservicesEnvironment),
		Spec:       msEnv.Spec,
		Status:     msEnv.Status,
	}

	msEnvComponentsList, err := client.MicroservicesComponents(msEnv.Name).List(api.ListEverything)

	if err != nil {
		log.Println("error while listing microservice components", err)

		_, criticalError = alaudaErrors.HandleError(err)
		if criticalError != nil {
			return nil, criticalError
		}

	}

	if msEnvComponentsList != nil && len(msEnvComponentsList.Items) > 0 {

		for _, comp := range msEnvComponentsList.Items {

			chart, err := catalogclient.CatalogControllerV1alpha1().Charts().Get(comp.Name, api.GetOptionsInCache)
			var responseChart Chart
			if err != nil {
				responseChart = Chart{
					ObjectMeta: api.NewObjectMeta(comp.ObjectMeta),
					TypeMeta:   api.NewTypeMeta(api.ResourceKindChart),
					Spec: ChartBasicInfo{
						Values:    "",
						ValueJson: nil,
					},
					Status: catalogv1alpha1.ChartStatus{
						AvailableReplicas: 0,
					},
				}
				log.Println("error while listing asf charts", err)
			} else {
				var rawValue string
				for _, file := range chart.Spec.Files {
					if file.Path == "values.yaml" {
						rawValue = file.Content
					}
				}
				responseChart = Chart{
					ObjectMeta: api.NewObjectMeta(chart.ObjectMeta),
					TypeMeta:   api.NewTypeMeta(api.ResourceKindChart),
					Spec: ChartBasicInfo{
						Values:    rawValue,
						ValueJson: chart.Spec.Values,
					},
					Status: chart.Status,
				}
			}

			responseComp := MicroservicesComponent{
				ObjectMeta: api.NewObjectMeta(comp.ObjectMeta),
				TypeMeta:   api.NewTypeMeta(api.ResourceKindMicroservicesComponent),
				Spec:       comp.Spec,
				Status:     comp.Status,
			}

			item := MicroservicesComponentListItem{
				Chart:                  responseChart,
				MicroservicesComponent: responseComp,
			}
			msenvDetail.MicroservicesComponents = append(msenvDetail.MicroservicesComponents, item)
		}
	}

	if msEnv.Spec.Namespace != nil {
		//	api.NamespaceAll
		bindings, err := client.MicroservicesEnvironmentBindings(v1.NamespaceAll).List(metaV1.ListOptions{
			LabelSelector: labels.Everything().String(),
			FieldSelector: fields.Everything().String(),
		})
		if err != nil {
			log.Println("error while listing microservice bindings ", err)

		}

		_, criticalError = alaudaErrors.HandleError(err)
		if criticalError != nil {
			return nil, criticalError
		}
		if bindings != nil && len(bindings.Items) > 0 {
			for _, binding := range bindings.Items {
				if binding.Spec.MicroservicesEnviromentRef.Name == msEnv.Name || binding.Name == msEnv.Name {
					msenvDetail.MicroserviceBindings = append(msenvDetail.MicroserviceBindings, MicroservicesEnvironmentBinding{
						ObjectMeta: api.NewObjectMeta(binding.ObjectMeta),
						TypeMeta:   api.NewTypeMeta(api.ResourceKindMicroservicesEnvironmentBinding),
						Spec:       binding.Spec,
						Status:     binding.Status,
					})
				}
			}

		}
	}
	return msenvDetail, nil
}

func GetMicroservicesEnvironmentByProjectName(client asfClient.AsfV1alpha1Interface, k8sclient kubernetes.Interface, projectName string) (*asfClient.MicroservicesEnvironment, error) {

	//var bindings *asfv1alpha1.MicroservicesEnvironmentBindingList
	bindings, err := client.MicroservicesEnvironmentBindings(projectName).List(metaV1.ListOptions{
		LabelSelector: labels.Everything().String(),
		FieldSelector: fields.Everything().String(),
	})
	if err != nil {
		log.Println("error while listing microservice bindings", err)

		return nil, err

	}

	if bindings != nil && len(bindings.Items) > 0 {
		// for now , one project bind to one envrionment
		binding := bindings.Items[0]

		microservicesEnvironmet, err := client.MicroservicesEnvironments().Get(binding.Spec.MicroservicesEnviromentRef.Name, api.GetOptionsInCache)

		if err != nil {
			log.Println("error while listing microservice bindings", err)

			return nil, err

		}

		return microservicesEnvironmet, nil
	}

	return nil, errors.New("failed to find binding microservicesenvironment for project " + projectName)

}
