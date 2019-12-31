package microservicesapplication

import (
	"crypto/tls"
	errs "errors"
	"log"
	"net/http"

	asfClient "alauda.io/diablo/src/backend/client/asf"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"

	msenv "alauda.io/diablo/src/backend/resource/microservicesenvironment"

	//
	"github.com/hudl/fargo"
	"k8s.io/client-go/kubernetes"
)

const (
	UP           string = "UP"
	DOWN         string = "DOWN"
	STARTING     string = "STARTING"
	OUTOFSERVICE string = "OUT_OF_SERVICE"
	UNKNOWN      string = "UNKNOWN"

	MicroservicesEnvironmentBindingsKind string = "MicroservicesEnvironmentBinding"
	MicroservicesEnvironmentBindingsName string = "microservicesEnvironmentBindings"
	AsfApiserverGroup                    string = "asf.alauda.io"
	AsfApiserverVersion                  string = "v1alpha1"
)

type Application struct {
	Name      string      `json:"name"`
	Status    string      `json:"status"`
	Instances []*Instance `json:"instance"`
}

// Instance [de]serializeable [to|from] Eureka [XML|JSON].
type Instance struct {
	InstanceId string `json:"instanceId"`
	HostName   string `json:"hostName"`
	App        string `json:"app"`
	Status     string `json:"status"`
}

// MicroservicesEnvironmentDetailList contains a list of MicroservicesEnvironments in the cluster.
type MicroservicesApplicationList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Jenkins.
	Apps []Application `json:"apps"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetMicroservicesEnvironmentDetailList returns a list of microservicesenvironments in the cluster.
func GetMicroservicesApplicationList(client asfClient.AsfV1alpha1Interface, k8sclient kubernetes.Interface, projectName string, dsQuery *dataselect.DataSelectQuery) (*MicroservicesApplicationList, error) {
	log.Println("Getting list of microservice applications")

	var err, criticalError error
	var nonCriticalErrors []error

	applications := make([]Application, 0)

	msEnv, err := msenv.GetMicroservicesEnvironmentByProjectName(client, k8sclient, projectName)
	if err != nil {
		log.Println("error while get microservice envrionment", err)

	}

	nonCriticalErrors, criticalError = errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	eurekaUrl := GetEurekaHostPath(*msEnv)

	if eurekaUrl == "" {
		log.Println("faild to get eureka url for project " + projectName)
		return nil, errs.New("faild to get eureka url for project " + projectName)
	}
	// comment out for fake data to to test
	// will fix the eurekahost path to node port

	//eurekaUrl = "http://118.24.215.11:31002"
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	fargo.HttpClient = &http.Client{Transport: tr}

	c := fargo.NewConn(eurekaUrl + "eureka")
	//c.UseJson = true

	apps, err := c.GetApps()

	if err != nil {
		log.Println("faild to get eureka apps for project  " + projectName)
		return nil, errs.New("faild to get eureka apps for project " + projectName)
	}

	for name, app := range apps {
		log.Println("Parsing metadata for app ", name)
		applications = append(applications, toUIEntity(*app))
	}

	//applications = fakeApplications()

	return toList(applications, nonCriticalErrors, dsQuery), nil
}

func toList(apps []Application, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *MicroservicesApplicationList {
	list := &MicroservicesApplicationList{
		ListMeta: api.ListMeta{TotalItems: len(apps)},
	}

	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(apps), dsQuery)
	apps = fromCells(cells)
	list.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	list.Errors = nonCriticalErrors
	list.Apps = apps

	return list
}

func toUIEntity(app fargo.Application) Application {
	instances := make([]*Instance, 0)
	status := UNKNOWN
	for _, instance := range app.Instances {
		if string(instance.Status) == UP {
			status = UP
		}
		instances = append(instances, &Instance{
			InstanceId: instance.InstanceId,
			HostName:   instance.HostName,
			App:        instance.App,
			Status:     string(instance.Status),
		})
	}

	return Application{
		Name:      app.Name,
		Status:    status,
		Instances: instances,
	}
}

func GetEurekaHostPath(msEnv asfClient.MicroservicesEnvironment) string {

	var hostPath = ""
	if len(msEnv.Spec.MicroservicesComponentRefs) > 0 {
		for _, componentRef := range msEnv.Spec.MicroservicesComponentRefs {
			log.Printf("get component : %v", componentRef)

			if componentRef.Name == "eureka" && componentRef.Status == asfClient.StatusRunning {
				/*  commentout for private network
				if *componentRef.IngressHost != "" {
					hostPath = *componentRef.IngressHost
				} else {
					hostPath = *componentRef.Host + "/"
				}
				*/

				hostPath = *componentRef.Host + "/"
				break
			}
		}
	}

	return hostPath

}
