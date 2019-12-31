package microservicesconfiguration

import (
	"crypto/tls"
	"encoding/json"
	errs "errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"

	"k8s.io/apimachinery/pkg/runtime"

	"alauda.io/diablo/src/backend/api"
	asfClient "alauda.io/diablo/src/backend/client/asf"

	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/dataselect"
	msenv "alauda.io/diablo/src/backend/resource/microservicesenvironment"

	//

	"k8s.io/client-go/kubernetes"
)

const (
	UP           string = "UP"
	DOWN         string = "DOWN"
	STARTING     string = "STARTING"
	OUTOFSERVICE string = "OUT_OF_SERVICE"
	UNKNOWN      string = "UNKNOWN"
)

type Entry interface{}

type Configuration struct {
	Name     string                 `json:"name"`
	Profile  string                 `json:"profile"`
	Label    string                 `json:"label"`
	FileName string                 `json:"fileName"`
	Source   map[string]interface{} `json:"source"`
}

// MicroservicesEnvironmentDetailList contains a list of MicroservicesEnvironments in the cluster.
type MicroservicesConfigurationList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of Jenkins.
	Configs []Configuration `json:"apps"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetMicroservicesEnvironmentDetailList returns a list of microservicesenvironments in the cluster.
func GetMicroservicesConfigurationList(client asfClient.AsfV1alpha1Interface, k8sclient kubernetes.Interface, projectName string, appName string, profile string, branch string, dsQuery *dataselect.DataSelectQuery) (*MicroservicesConfigurationList, error) {
	//log.Println("Getting list of microservice applications")

	var err, criticalError error
	var nonCriticalErrors []error

	configurations := make([]Configuration, 0)

	msEnv, err := msenv.GetMicroservicesEnvironmentByProjectName(client, k8sclient, projectName)
	if err != nil {
		log.Println("error while get microservice envrionment", err)

	}

	nonCriticalErrors, criticalError = errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	configserverUrl := GetConfigServerURLs(*msEnv)

	if configserverUrl == "" {
		log.Println("faild to get eureka url for project " + projectName)
		return nil, errs.New("faild to get eureka url for project " + projectName)
	}

	url := fmt.Sprintf("%s%s/%s/%s", configserverUrl, appName, profile, branch)

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	c := &http.Client{Transport: tr}
	resp, err := c.Get(url)
	if err != nil {
		log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())
		return nil, errs.New("faild to get configuration for project " + projectName)

	}
	if resp.StatusCode > 299 || resp.StatusCode < 200 {
		log.Println("Non-200 rcode of ", resp.StatusCode)

		return nil, errs.New("faild to get configuration for project " + projectName)
	}

	body, err := ioutil.ReadAll(resp.Body)
	resp.Body.Close()
	//resp.Close = true
	if err != nil {
		log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())
		return nil, errs.New("faild to get configuration for project " + projectName)
	}

	configMaplist := parseConfiguration(body, appName, profile, branch)

	for _, config := range configMaplist {
		configurations = append(configurations, *config)
	}

	//applications = fakeApplications()

	return toList(configurations, nonCriticalErrors, dsQuery), nil
}

func toList(configs []Configuration, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *MicroservicesConfigurationList {
	list := &MicroservicesConfigurationList{
		ListMeta: api.ListMeta{TotalItems: len(configs)},
	}

	cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(configs), dsQuery)
	configs = fromCells(cells)
	list.ListMeta = api.ListMeta{TotalItems: filteredTotal}
	list.Errors = nonCriticalErrors
	list.Configs = configs

	return list
}

func GetServicesURLs(msEnv asfClient.MicroservicesEnvironment) (string, string, []string, []string) {

	var eurekaUrl, configserverUrl = "", ""
	profiles := []string{"development", "test", "production", "dev", "prod", "qa"}
	labels := []string{"master", "test"}
	if len(msEnv.Spec.MicroservicesComponentRefs) > 0 {
		for _, componentRef := range msEnv.Spec.MicroservicesComponentRefs {

			if componentRef.Name == "config-server" && componentRef.Status == asfClient.StatusRunning {
				//use clusterip as service url
				configserverUrl = *componentRef.Host + "/"
				/*
					if *componentRef.IngressHost != "" {
						configserverUrl = *componentRef.IngressHost
					} else {
						configserverUrl = *componentRef.Host + "/"
					}
				*/
				profiles = GetSubValues(componentRef, "profiles")
				labels = GetSubValues(componentRef, "labels")

			} else if componentRef.Name == "eureka" && componentRef.Status == asfClient.StatusRunning {
				//use clusterip as service url
				eurekaUrl = *componentRef.Host + "/"
				/*
					if *componentRef.IngressHost != "" {
						eurekaUrl = *componentRef.IngressHost
					} else {
						eurekaUrl = *componentRef.Host + "/"
					}
				*/

			}
		}
	}

	if len(labels) == 0 {
		labels = []string{"master"}
	}

	if len(profiles) == 0 {
		profiles = []string{"dev", "test", "prod"}
	}

	return eurekaUrl, configserverUrl, profiles, labels

}

func GetSubValues(msComp asfClient.MicroservicesComponentRef, key string) []string {

	var subValues *map[string]*runtime.RawExtension = msComp.SubValues

	//result := make(map[string]interface{})

	var entry []string

	for k, out := range *subValues {

		if k == key {
			err := json.Unmarshal(out.Raw, &entry)

			if err != nil {
				log.Println("error get subvalues for  ", key, err)

				continue

			}

			return entry

		}

	}

	return make([]string, 0)

}

func GetConfigServerURLs(msEnv asfClient.MicroservicesEnvironment) string {

	var configserverUrl = ""
	if len(msEnv.Spec.MicroservicesComponentRefs) > 0 {
		for _, componentRef := range msEnv.Spec.MicroservicesComponentRefs {

			if componentRef.Name == "config-server" && componentRef.Status == asfClient.StatusRunning {
				//use clusterip as service url
				configserverUrl = *componentRef.Host + "/"
				/*
					if *componentRef.IngressHost != "" {
						configserverUrl = *componentRef.IngressHost
					} else {
						configserverUrl = *componentRef.Host + "/"
					}
				*/

			}
		}
	}

	return configserverUrl

}

func parseConfiguration(body []byte, appName string, profile string, branch string) map[string]*Configuration {
	var cloudConfig springCloudConfig
	err := json.Unmarshal(body, &cloudConfig)
	if err != nil {
		panic("Cannot parse configuration, message: " + err.Error())
	}

	configs := make(map[string]*Configuration)

	for _, propertySource := range cloudConfig.PropertySources {
		configkey := fmt.Sprintf("%s_%s_%s", appName, profile, branch)
		config := &Configuration{
			Name:     appName,
			Profile:  profile,
			Label:    branch,
			FileName: propertySource.Name,
			Source:   propertySource.Source,
		}
		if strings.Contains(propertySource.Name, "application.") {

			configkey = fmt.Sprintf("global_basic_%s", branch)
			config = &Configuration{
				Name:     appName,
				Profile:  profile,
				Label:    branch,
				FileName: propertySource.Name,
				Source:   propertySource.Source,
			}
		} else if strings.Contains(propertySource.Name, fmt.Sprintf("%s-%s.", appName, profile)) {
			configkey = fmt.Sprintf("%s_%s_%s", appName, profile, branch)
			config = &Configuration{
				Name:     appName,
				Profile:  profile,
				Label:    branch,
				FileName: propertySource.Name,
				Source:   propertySource.Source,
			}

		} else {
			configkey = fmt.Sprintf("%s_basic_%s", appName, branch)
			config = &Configuration{
				Name:     appName,
				Profile:  "basic",
				Label:    branch,
				FileName: propertySource.Name,
				Source:   propertySource.Source,
			}

		}
		configs[configkey] = config
	}

	log.Println("start send config to chans ", configs)
	return configs

}
