package jenkinsbinding

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/client-go/kubernetes"
)

// JenkinsBindingList contains a list of jenkins in the cluster.
type JenkinsBindingList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of JenkinsBinding.
	Items []JenkinsBinding `json:"jenkinsbindings"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// JenkinsBinding is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type JenkinsBinding struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   devopsv1alpha1.JenkinsBindingSpec   `json:"spec"`
	Status devopsv1alpha1.JenkinsBindingStatus `json:"status"`
}

type APIResponse struct {
	Data   CronCheckResult `json:"data"`
	Status string          `json:"status"`
}

type CronCheckResult struct {
	Next     string `json:"next"`
	Previous string `json:"previous"`
	SanityZh string `json:"sanity_zh_cn"`
	SanityEn string `json:"sanity_en"`
	Error    string `json:"error"`
}

// // GetProjectListFromChannels returns a list of all namespaces in the cluster.
// func GetProjectListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery) (*JenkinsBindingList, error) {
// 	jenkins := <-channels.JenkinsBindingList.List
// 	err := <-channels.JenkinsBindingList.Error

// 	nonCriticalErrors, criticalError := errors.HandleError(err)
// 	if criticalError != nil {
// 		return nil, criticalError
// 	}

// 	return toJenkinsBindingList(jenkins.Items, nil, nonCriticalErrors, dsQuery), nil
// }

// GetJenkinsBindingList returns a list of all namespaces in the cluster.
func GetJenkinsBindingList(client devopsclient.Interface, k8sclient kubernetes.Interface,
	namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*JenkinsBindingList, error) {
	log.Println("Getting list of jenkins")

	jenkinsList, err := client.DevopsV1alpha1().JenkinsBindings(namespace.ToRequestParam()).List(api.ListEverything)
	if err != nil {
		log.Println("error while listing jenkins", err)

	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toJenkinsBindingList(jenkinsList.Items, nonCriticalErrors, dsQuery), nil
}

func toJenkinsBindingList(jenkins []devopsv1alpha1.JenkinsBinding, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *JenkinsBindingList {
	jenkinsList := &JenkinsBindingList{
		Items:    make([]JenkinsBinding, 0),
		ListMeta: api.ListMeta{TotalItems: len(jenkins)},
	}

	jenkinsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(jenkins), dsQuery)
	jenkins = fromCells(jenkinsCells)
	jenkinsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	jenkinsList.Errors = nonCriticalErrors

	for _, jenk := range jenkins {
		jenkinsList.Items = append(jenkinsList.Items, toJenkinsBinding(jenk))
	}

	return jenkinsList
}

func toJenkinsBinding(jenkins devopsv1alpha1.JenkinsBinding) JenkinsBinding {
	jenk := JenkinsBinding{
		ObjectMeta: api.NewObjectMeta(jenkins.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindJenkinsBinding),
		// data here
		Spec:   jenkins.Spec,
		Status: jenkins.Status,
	}
	if jenk.ObjectMeta.Annotations == nil {
		jenk.ObjectMeta.Annotations = make(map[string]string, 0)
	}
	jenk.ObjectMeta.Annotations[common.AnnotationsKeyToolType] = devopsv1alpha1.ToolChainContinuousIntegrationName
	jenk.ObjectMeta.Annotations[common.AnnotationsKeyToolItemKind] = devopsv1alpha1.ResourceKindJenkins
	jenk.ObjectMeta.Annotations[common.AnnotationsKeyToolItemType] = ""
	jenk.ObjectMeta.Annotations[common.AnnotationsKeyToolItemPublic] = "false"
	return jenk
}
