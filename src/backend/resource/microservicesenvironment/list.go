package microservicesenvironment

import (
	"log"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	asfClient "alauda.io/diablo/src/backend/client/asf"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"

	//
	"k8s.io/client-go/kubernetes"
)

// MicroservicesEnvironmentDetailList contains a list of MicroservicesEnvironments in the cluster.
type MicroservicesEnvironmentDetailList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Jenkins.
	MicroservicesEnvironments []MicroservicesEnvironment `json:"microservicesEnvironments"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetMicroservicesEnvironmentDetailList returns a list of microservicesenvironments in the cluster.
func GetMicroservicesEnvironmentDetailList(client asfClient.AsfV1alpha1Interface, k8sclient kubernetes.Interface, projectName string, dsQuery *dataselect.DataSelectQuery) (*MicroservicesEnvironmentDetailList, error) {
	log.Println("Getting list of microservice environments")
	var microservicesEnvironmentList *asfClient.MicroservicesEnvironmentList = &asfClient.MicroservicesEnvironmentList{
		Items: make([]asfClient.MicroservicesEnvironment, 0),
	}
	var bindings *asfClient.MicroservicesEnvironmentBindingList
	var err, criticalError error
	var nonCriticalErrors []error
	if projectName != "" {
		//log.Println(projectName)
		bindings, err := client.MicroservicesEnvironmentBindings(projectName).List(metaV1.ListOptions{
			LabelSelector: labels.Everything().String(),
			FieldSelector: fields.Everything().String(),
		})
		if err != nil {
			log.Println("error while listing microservice bindings", err)

			nonCriticalErrors, criticalError = errors.HandleError(err)
			if criticalError != nil {
				return nil, criticalError
			}
		}

		if bindings != nil && len(bindings.Items) > 0 {
			// for now , one project bind to one envrionment
			binding := bindings.Items[0]

			log.Println(binding.Spec.MicroservicesEnviromentRef.Name)

			microservicesEnvironmet, err := client.MicroservicesEnvironments().Get(binding.Spec.MicroservicesEnviromentRef.Name, api.GetOptionsInCache)

			if err != nil {
				log.Println("error while listing microservice bindings", err)

			}

			nonCriticalErrors, criticalError = errors.HandleError(err)
			if criticalError != nil {
				return nil, criticalError
			}

			microservicesEnvironmentList.Items = append(microservicesEnvironmentList.Items, *microservicesEnvironmet)

		}

	} else {

		bindings, err = client.MicroservicesEnvironmentBindings(v1.NamespaceAll).List(metaV1.ListOptions{
			LabelSelector: labels.Everything().String(),
			FieldSelector: fields.Everything().String(),
		})
		if err != nil {
			log.Println("error while listing microservice bindings", err)

		}

		nonCriticalErrors, criticalError = errors.HandleError(err)
		if criticalError != nil {
			return nil, criticalError
		}

		microservicesEnvironmentList, err = client.MicroservicesEnvironments().List(metaV1.ListOptions{
			LabelSelector: labels.Everything().String(),
			FieldSelector: fields.Everything().String(),
		})

		if err != nil {
			log.Println("error while listing microservice environments", err)

		}

		nonCriticalErrors, criticalError = errors.HandleError(err)
		if criticalError != nil {
			return nil, criticalError
		}
	}

	/*
		fieldSelector, err := fields.ParseSelector("spec.microservicesEnviroment.name=" + node.Name )

		if err != nil {
			return nil, err
		}
	*/

	if bindings == nil {

		bindings = &asfClient.MicroservicesEnvironmentBindingList{}

		bindings.Items = []asfClient.MicroservicesEnvironmentBinding{}

	}

	return toList(microservicesEnvironmentList.Items, bindings.Items, nonCriticalErrors, dsQuery), nil
}

func toList(msEnvs []asfClient.MicroservicesEnvironment, bindings []asfClient.MicroservicesEnvironmentBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *MicroservicesEnvironmentDetailList {
	list := &MicroservicesEnvironmentDetailList{
		MicroservicesEnvironments: make([]MicroservicesEnvironment, 0),
		ListMeta:                  api.ListMeta{TotalItems: len(msEnvs)},
	}

	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(msEnvs), dsQuery)
	msEnvs = fromCells(cells)
	list.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	list.Errors = nonCriticalErrors

	//list.MicroservicesEnvironments = msEnvs

	for _, msEnv := range msEnvs {
		list.MicroservicesEnvironments = append(list.MicroservicesEnvironments, toUIEntity(msEnv, bindings))

	}

	return list
}

func toUIEntity(msEnv asfClient.MicroservicesEnvironment, bindings []asfClient.MicroservicesEnvironmentBinding) MicroservicesEnvironment {
	bindingList := filterBindingProjectsByEnvironmentName(msEnv, bindings)
	UIEntity := MicroservicesEnvironment{
		ObjectMeta:      api.NewObjectMeta(msEnv.ObjectMeta),
		TypeMeta:        api.NewTypeMeta(api.ResourceKindMicroservicesEnvironment),
		BindingProjects: &bindingList,
		// data here
		Spec:   msEnv.Spec,
		Status: msEnv.Status,
	}
	return UIEntity
}

// Returns filtered list of binding objects. MicroservicesEnvironmentBindings list is filtered to get only MicroservicesEnvironmentBindings targeting
// MicroservicesEnvironments on the list.
func filterBindingsByEnvironments(msEnvs []asfClient.MicroservicesEnvironment, bindings []asfClient.MicroservicesEnvironmentBinding) []asfClient.MicroservicesEnvironmentBinding {
	result := make([]asfClient.MicroservicesEnvironmentBinding, 0)
	bindingMap := make(map[string]bool, 0)

	if len(bindings) == 0 || len(msEnvs) == 0 {
		return result
	}

	for _, msEnv := range msEnvs {
		bindingMap[msEnv.Name] = true
	}

	for _, binding := range bindings {
		if _, exists := bindingMap[binding.Spec.MicroservicesEnviromentRef.Name]; exists {
			result = append(result, binding)
		}
	}

	return result
}

func filterBindingProjectsByEnvironmentName(msEnv asfClient.MicroservicesEnvironment, bindings []asfClient.MicroservicesEnvironmentBinding) []BindingProject {
	result := make([]BindingProject, 0)

	bindingMap := make(map[string]bool, 0)

	if len(bindings) == 0 {
		return result
	}
	bindingMap[msEnv.Name] = true

	for _, binding := range bindings {
		if _, exists := bindingMap[binding.Spec.MicroservicesEnviromentRef.Name]; exists {
			result = append(result, BindingProject{
				Name: binding.Namespace,
			})
		}
	}

	return result
}
