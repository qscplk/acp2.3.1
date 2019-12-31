package application

import (
	goErrors "errors"
	"log"
	"sort"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/daemonset"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/deployment"
	"alauda.io/diablo/src/backend/resource/statefulset"
	client "k8s.io/client-go/kubernetes"
)

// ApplicationList contains a list of Applications in the cluster.
type ApplicationList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Applications.
	Applications []Application `json:"applications"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// Application sets a definition for application
type Application struct {
	ObjectMeta   api.ObjectMeta               `json:"objectMeta"`
	Description  string                       `json:"description"`
	Deployments  deployment.DeploymentSlice   `json:"deployments"`
	Daemonsets   daemonset.DaemonSetSlice     `json:"daemonsets"`
	StatefulSets statefulset.StatefulSetSlice `json:"statefulsets"`
}

// GetApplicationList returns a list of all applications in the cluster.
func GetApplicationList(client *appCore.ApplicationClient, k8sclient client.Interface, namespace string, dsQuery *dataselect.DataSelectQuery, metricClient metricapi.MetricClient) (list *ApplicationList, err error) {
	log.Println("Getting list of all applications in namespace: ", namespace)
	coreApplications, errs := client.ListApplications(namespace)
	if coreApplications == nil {
		return nil, goErrors.New("get empty app list")
	}
	list = &ApplicationList{
		ListMeta:     api.ListMeta{TotalItems: len(*coreApplications)},
		Applications: make([]Application, 0, len(*coreApplications)),
		Errors:       errs,
	}

	rc, _, criticalError := common.GetRelationResource(k8sclient, namespace)
	if criticalError != nil {
		return list, criticalError
	}
	for _, coreApplication := range *coreApplications {
		application, err := GenerateFromCore(coreApplication, rc, namespace, metricClient)
		if err != nil {
			return nil, err
		}
		list.Applications = append(list.Applications, application)
	}
	list, err = toApplicationList(list, dsQuery)
	if err != nil {
		return nil, err
	}
	return list, nil
}

func GenerateFromCore(app appCore.Application, rc *common.ResourceCollection, namespace string, metricClient metricapi.MetricClient) (Application, error) {
	var application Application

	deploymentList, err := deployment.GenerateFromCore(app, rc, metricClient)
	if err != nil {
		return application, err
	}
	daemonSetList, err := daemonset.GenerateFromCore(app, rc, metricClient)
	if err != nil {
		return application, err
	}
	statefulSetList, err := statefulset.GenerateFromCore(app, rc, metricClient)
	if err != nil {
		return application, err
	}
	deploymentSlice := deployment.DeploymentSlice(deploymentList.Deployments)
	sort.Stable(deploymentSlice)
	daemonsetSlice := daemonset.DaemonSetSlice(daemonSetList.DaemonSets)
	sort.Stable(daemonsetSlice)
	statefulsetSlice := statefulset.StatefulSetSlice(statefulSetList.StatefulSets)
	sort.Stable(statefulsetSlice)
	return Application{
		ObjectMeta: api.ObjectMeta{
			Name: app.GetAppCrd().ObjectMeta.GetName(),
		},
		Description:  app.GetDisplayName(common.GetLocalBaseDomain()),
		Deployments:  deploymentSlice,
		Daemonsets:   daemonsetSlice,
		StatefulSets: statefulsetSlice,
	}, nil
}

func toApplicationList(
	list *ApplicationList,
	dsQuery *dataselect.DataSelectQuery,
) (*ApplicationList, error) {
	appCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(list.Applications), dsQuery)
	apps := fromCells(appCells)
	list.Applications = apps
	list.ListMeta.TotalItems = filteredTotal
	return list, nil
}
