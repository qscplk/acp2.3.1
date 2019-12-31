package codereposervice

import (
	"log"
	"strconv"

	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
)

// CodeRepoServiceList contains a list of CodeRepoService in the cluster.
type CodeRepoServiceList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of CodeRepoService.
	Items []CodeRepoService `json:"codereposervices"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// CodeRepoService is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type CodeRepoService struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   v1alpha1.CodeRepoServiceSpec `json:"spec"`
	Status v1alpha1.ServiceStatus       `json:"status"`
}

// GetCodeRepoServiceList returns a list of codereposervice
func GetCodeRepoServiceList(client devopsclient.Interface, dsQuery *dataselect.DataSelectQuery) (*CodeRepoServiceList, error) {
	log.Println("Getting list of codereposervice")

	crsList, err := client.DevopsV1alpha1().CodeRepoServices().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing codereposervice", err)
	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toList(crsList.Items, nonCriticalErrors, dsQuery), nil
}

func toList(codeRepoServices []v1alpha1.CodeRepoService, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *CodeRepoServiceList {
	crsList := &CodeRepoServiceList{
		Items:    make([]CodeRepoService, 0),
		ListMeta: api.ListMeta{TotalItems: len(codeRepoServices)},
	}

	crsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(codeRepoServices), dsQuery)
	codeRepoServices = fromCells(crsCells)
	crsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	crsList.Errors = nonCriticalErrors

	for _, jenk := range codeRepoServices {
		crsList.Items = append(crsList.Items, toDetailsInList(jenk))
	}

	return crsList
}

func toDetailsInList(codeRepoService v1alpha1.CodeRepoService) CodeRepoService {
	crs := CodeRepoService{
		ObjectMeta: api.NewObjectMeta(codeRepoService.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindCodeRepoService),
		Spec:       codeRepoService.Spec,
		Status:     codeRepoService.Status,
	}
	if crs.ObjectMeta.Annotations == nil {
		crs.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = v1alpha1.ToolChainCodeRepositoryName
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = v1alpha1.ResourceKindCodeRepoService
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolItemType] = codeRepoService.Spec.Type.String()
	crs.ObjectMeta.Annotations[common.AnnotationsKeyToolItemPublic] = strconv.FormatBool(codeRepoService.Spec.Public)
	return crs
}

func GetCodeRepoServiceResources(client devopsclient.Interface, name string) (resourceList *common.ResourceList, err error) {
	// todo
	return
}
