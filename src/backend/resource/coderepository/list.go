package coderepository

import (
	"log"
	"sync"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/pipelineconfig"
)

// CodeRepositoryList contains a list of CodeRepository in the cluster.
type CodeRepositoryList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of CodeRepository.
	Items []CodeRepository `json:"coderepositories"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// CodeRepository is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type CodeRepository struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.CodeRepositorySpec   `json:"spec"`
	Status v1alpha1.CodeRepositoryStatus `json:"status"`
}

// GetPipelineConfigListAsResourceList get the resources refer to codeRepository
func GetResourceListByCodeRepository(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (resourceList *common.ResourceList, err error) {
	resourceList = &common.ResourceList{}
	repositoryList, err := GetCodeRepositoryList(client, namespace, dsQuery)
	if err != nil {
		return
	}

	wait := sync.WaitGroup{}
	for _, r := range repositoryList.Items {
		go func(namespace, name string) {
			dsQuery := dataselect.GeSimpleFieldQuery(dataselect.CodeRepositoryProperty, name)
			items := pipelineconfig.GetPipelineConfigListAsResourceList(client, namespace, dsQuery)
			resourceList.Items = append(resourceList.Items, items...)
			wait.Done()
		}(r.ObjectMeta.Namespace, r.ObjectMeta.Name)
		wait.Add(1)
	}
	wait.Wait()
	return
}

func GetResourcesReferToRemovedRepos(client devopsclient.Interface, oldBinding, newBinding *v1alpha1.CodeRepoBinding) (resourceList *common.ResourceList) {
	resourceList = &common.ResourceList{}

	var removedRepoNames []string
	for _, oldCondition := range oldBinding.Status.Conditions {
		if oldCondition.Type != v1alpha1.JenkinsBindingStatusTypeRepository {
			continue
		}

		var found bool
		for _, newCondition := range newBinding.Status.Conditions {
			if newCondition.Type != v1alpha1.JenkinsBindingStatusTypeRepository {
				continue
			}

			if oldCondition.Name == newCondition.Name {
				found = true
				break
			}
		}
		if !found {
			removedRepoNames = append(removedRepoNames, oldCondition.Name)
		}
	}

	log.Println("removedRepoNames: ", removedRepoNames)
	wait := sync.WaitGroup{}
	for _, repoName := range removedRepoNames {
		log.Println("get resource refer to ", repoName)
		go func(namespace, name string) {
			repoQuery := dataselect.GeSimpleFieldQuery(dataselect.CodeRepositoryProperty, name)
			items := pipelineconfig.GetPipelineConfigListAsResourceList(client, namespace, repoQuery)
			resourceList.Items = append(resourceList.Items, items...)
			wait.Done()
		}(newBinding.Namespace, repoName)
		wait.Add(1)
	}
	wait.Wait()

	return
}

// GetCodeRepositoryList returns a list of coderepobinding
func GetCodeRepositoryList(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*CodeRepositoryList, error) {
	log.Println("Getting list of repository")

	crsList, err := client.DevopsV1alpha1().CodeRepositories(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing repositories", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

// GetCodeRepositoryList returns a list of coderepobinding
func GetCodeRepositoryListInBinding(client devopsclient.Interface, namespace, name string, dsQuery *dataselect.DataSelectQuery) (*CodeRepositoryList, error) {
	log.Println("Getting list of repository from binding ", name)

	binding, err := client.DevopsV1alpha1().CodeRepoBindings(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	crsList, err := client.DevopsV1alpha1().CodeRepositories(namespace).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing repositories", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	var repos []v1alpha1.CodeRepository
	for _, item := range crsList.Items {
		if item.Spec.CodeRepoBinding.Name == binding.GetName() {
			repos = append(repos, item)
		}
		// for _, condition := range binding.Status.Conditions {
		// 	if item.GetName() == condition.Name {
		// 		repos = append(repos, item)
		// 	}
		// }
	}

	return toList(repos, nonCriticalErrors, dsQuery), nil
}

func toList(codeRepositories []v1alpha1.CodeRepository, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *CodeRepositoryList {
	crsList := &CodeRepositoryList{
		Items:    make([]CodeRepository, 0),
		ListMeta: api.ListMeta{TotalItems: len(codeRepositories)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(codeRepositories), dsQuery)
	codeRepositories = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, repo := range codeRepositories {
		crsList.Items = append(crsList.Items, toDetailsInList(repo))
	}

	return crsList
}

func toDetailsInList(codeRepository v1alpha1.CodeRepository) CodeRepository {
	crs := CodeRepository{
		ObjectMeta: api.NewObjectMeta(codeRepository.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeRepository),
		Spec:       codeRepository.Spec,
		Status:     codeRepository.Status,
	}
	return crs
}

func GetCodeRepositoryBranches(client devopsclient.Interface, namespace, name, sortBy, sortMode string) (*v1alpha1.CodeRepoBranchResult, error) {
	opts := &v1alpha1.CodeRepoBranchOptions{
		SortBy:   sortBy,
		SortMode: sortMode,
	}
	log.Println("Get coderepository branches repository: ", name, " sortBy: ", sortBy, " sortMode: ", sortMode)

	branches, err := client.DevopsV1alpha1().CodeRepositories(namespace).GetBranches(name, opts)
	if err != nil {
		log.Println("Error get coderepository branches: ", err)
		return nil, err
	}
	return branches, nil
}
