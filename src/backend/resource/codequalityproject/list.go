package codequalityproject

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"log"
)

// CodeQualityProjectList contains a list of CodeQualityProject in the cluster.
type CodeQualityProjectList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of CodeQualityProject.
	Items []CodeQualityProject `json:"codequalityprojects"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// CodeQualityProject is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type CodeQualityProject struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.CodeQualityProjectSpec   `json:"spec"`
	Status v1alpha1.CodeQualityProjectStatus `json:"status"`
}

// GetCodeQualityProjectList returns a list of codequalityproject
func GetCodeQualityProjectList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*CodeQualityProjectList, error) {
	log.Println("Getting list of code quality project")

	crsList, err := client.DevopsV1alpha1().CodeQualityProjects(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing code quality projects", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

// GetCodeQualityProjectListInBinding returns a list of codequaityproject in binding
func GetCodeQualityProjectListInBinding(client devopsclient.Interface, namespace, name string, dsQuery *dataselect.DataSelectQuery) (*CodeQualityProjectList, error) {
	log.Println("Getting list of code quality project from binding ", name)

	binding, err := client.DevopsV1alpha1().CodeQualityBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	cqpList, err := client.DevopsV1alpha1().CodeQualityProjects(namespace).List(api.ListEverything)
	if err != nil {
		log.Println("error while getting code quality projects", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	var projects []v1alpha1.CodeQualityProject
	for _, item := range cqpList.Items {
		if item.Spec.CodeQualityBinding.Name == binding.Name {
			projects = append(projects, item)
		}
	}

	return toList(projects, nonCriticalErrors, dsQuery), nil
}

func toList(codeQualityProjects []v1alpha1.CodeQualityProject, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *CodeQualityProjectList {
	crsList := &CodeQualityProjectList{
		Items:    make([]CodeQualityProject, 0),
		ListMeta: api.ListMeta{TotalItems: len(codeQualityProjects)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(codeQualityProjects), dsQuery)
	codeQualityProjects = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, project := range codeQualityProjects {
		crsList.Items = append(crsList.Items, toDetailsInList(project))
	}

	return crsList
}

func toDetailsInList(codeQualityProject v1alpha1.CodeQualityProject) CodeQualityProject {
	crs := CodeQualityProject{
		ObjectMeta: api.NewObjectMeta(codeQualityProject.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeQualityProject),
		Spec:       codeQualityProject.Spec,
		Status:     codeQualityProject.Status,
	}
	return crs
}
