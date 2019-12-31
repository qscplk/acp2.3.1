package jenkins

import (
	"alauda.io/diablo/src/backend/resource/common"
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/client-go/kubernetes"
)

// JenkinsList contains a list of jenkins in the cluster.
type JenkinsList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Jenkins.
	Jenkins []Jenkins `json:"jenkins"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// Jenkins is a presentation layer view of Kubernetes namespaces. This means it is namespace plus
// additional augmented data we can get from other sources.
type Jenkins struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	Spec   devopsv1alpha1.JenkinsSpec   `json:"spec"`
	Status devopsv1alpha1.JenkinsStatus `json:"status"`
}

// // GetProjectListFromChannels returns a list of all namespaces in the cluster.
// func GetProjectListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery) (*JenkinsList, error) {
// 	jenkins := <-channels.JenkinsList.List
// 	err := <-channels.JenkinsList.Error

// 	nonCriticalErrors, criticalError := errors.HandleError(err)
// 	if criticalError != nil {
// 		return nil, criticalError
// 	}

// 	return toJenkinsList(jenkins.Items, nil, nonCriticalErrors, dsQuery), nil
// }

// GetJenkinsList returns a list of all namespaces in the cluster.
func GetJenkinsList(client devopsclient.Interface, k8sclient kubernetes.Interface, dsQuery *dataselect.DataSelectQuery) (*JenkinsList, error) {
	log.Println("Getting list of jenkins")

	jenkinsList, err := client.DevopsV1alpha1().Jenkinses().List(api.ListEverything)
	if err != nil {
		log.Println("error while listing jenkins", err)

	}
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toJenkinsList(jenkinsList.Items, nonCriticalErrors, dsQuery), nil
}

func toJenkinsList(jenkins []devopsv1alpha1.Jenkins, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *JenkinsList {
	jenkinsList := &JenkinsList{
		Jenkins:  make([]Jenkins, 0),
		ListMeta: api.ListMeta{TotalItems: len(jenkins)},
	}

	jenkinsCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(jenkins), dsQuery)
	jenkins = fromCells(jenkinsCells)
	jenkinsList.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	jenkinsList.Errors = nonCriticalErrors

	for _, jenk := range jenkins {
		jenkinsList.Jenkins = append(jenkinsList.Jenkins, toJenkins(jenk))
	}

	return jenkinsList
}

func toJenkins(jenkins devopsv1alpha1.Jenkins) Jenkins {
	jenk := Jenkins{
		ObjectMeta: api.NewObjectMeta(jenkins.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindJenkins),
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
