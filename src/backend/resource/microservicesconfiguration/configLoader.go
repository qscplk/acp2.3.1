package microservicesconfiguration

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type springCloudConfig struct {
	Name            string           `json:"name"`
	Profiles        []string         `json:"profiles"`
	Label           string           `json:"label"`
	Version         string           `json:"version"`
	PropertySources []propertySource `json:"propertySources"`
}

type propertySource struct {
	Name   string                 `json:"name"`
	Source map[string]interface{} `json:"source"`
}

type ConfigServerLoader struct {
	ConfigServerURL string `json:"configServerUrl"`
	Apps            []string
	Profiles        []string
	Labels          []string `json:"labels"`
	Chans           chan map[string]*Configuration
}

func (loader ConfigServerLoader) Load() map[string]*Configuration {
	configMaplist := make(map[string]*Configuration)
	var wg sync.WaitGroup

	configChannel := make(chan map[string]*Configuration, len(loader.Apps)*len(loader.Profiles)*len(loader.Labels))
	errorChannel := make(chan error, 1000)

	//loader.Chans = make(chan map[string]*Configuration, len(loader.Apps)*len(loader.Profiles)*len(loader.Labels))
	for _, appName := range loader.Apps {
		for _, profile := range loader.Profiles {

			if profile == "" {
				continue
			}

			for _, label := range loader.Labels {

				if label == "" {
					continue
				}

				wg.Add(1)

				go func(configserverURL string, appName string, profile string, branch string) {
					//log.Println("starting")
					defer func() {
						//log.Println("ending")
						wg.Done()
					}()

					url := fmt.Sprintf("%s%s/%s/%s", configserverURL, appName, profile, branch)
					//log.Println("Loading config from  " + url)
					tr := &http.Transport{
						TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
						MaxIdleConns:        100,
						MaxIdleConnsPerHost: 32,
					}
					c := &http.Client{Transport: tr}
					//log.Println("get config starting")
					//start := time.Now()
					resp, err := c.Get(url)
					//secs := time.Since(start).Seconds()
					//log.Println(fmt.Sprintf("get config finished and costing %.2f", secs))
					if err != nil {
						log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())
						errorChannel <- err
						return
					}
					if resp.StatusCode > 299 || resp.StatusCode < 200 {
						log.Println("Non-200 rcode of ", resp.StatusCode)

						return
					}
					body, err := ioutil.ReadAll(resp.Body)
					resp.Body.Close()
					//resp.Close = true
					if err != nil {
						log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())
						errorChannel <- err
						return
					}

					//log.Println(body)

					var cloudConfig springCloudConfig
					err = json.Unmarshal(body, &cloudConfig)
					//log.Println("json unmarshal config")
					if err != nil {
						log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())
						errorChannel <- err
					} else {

						log.Println("starting process config")
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
									Name:     "global",
									Profile:  "basic",
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

						//log.Println("finishing process config")
						configChannel <- configs
					}

				}(loader.ConfigServerURL, appName, profile, label)

				//go loader.LoadConfigurationFromBranch(appName, profile, label, &wg)

			}
		}
	}

	if waitTimeout(&wg, 30*time.Second) {
		fmt.Println("Timed out waiting for wait group")
	} else {
		fmt.Println("Wait group finished")
	}

	close(configChannel)
	close(errorChannel)

	for config := range configChannel {
		for k, v := range config {
			configMaplist[k] = v
		}

	}

	//fmt.Println("return configs ", configMaplist)
	return configMaplist
}

func IsExistAPPConfig(configServerUrl, appName, profile string) bool {
	url := fmt.Sprintf("%s%s/%s", configServerUrl, appName, profile)
	resp, err := http.Get(url)
	if err != nil {
		log.Println("Couldn't load configuration.Error: " + err.Error())
		return false
	}
	if resp.StatusCode > 299 || resp.StatusCode < 200 {
		log.Println("Non-200 rcode of ", resp.StatusCode, url)
		return false
	}

	return true

}

// Loads config
func (loader ConfigServerLoader) LoadConfigurationFromBranch(appName string, profile string, branch string, wg *sync.WaitGroup) {
	defer wg.Done()

	url := fmt.Sprintf("%s%s/%s/%s", loader.ConfigServerURL, appName, profile, branch)
	fmt.Printf("Loading config from %s\n", url)

	resp, err := http.Get(url)
	if err != nil {
		log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())

		return
	}
	if resp.StatusCode > 299 || resp.StatusCode < 200 {
		log.Println("Non-200 rcode of ", resp.StatusCode)

		return
	}
	body, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		log.Println("Couldn't load configuration, cannot start. Terminating. Error: " + err.Error())

		return
	}

	loader.parseConfiguration(body, appName, profile, branch)

}

/*
* This will take the Response and unmarshall into structure
 */
func (loader ConfigServerLoader) parseConfiguration(body []byte, appName string, profile string, branch string) {
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
				Name:     "global",
				Profile:  "basic",
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
	loader.Chans <- configs

}

// waitTimeout waits for the waitgroup for the specified max timeout.
// Returns true if waiting timed out.
func waitTimeout(wg *sync.WaitGroup, timeout time.Duration) bool {
	c := make(chan struct{})
	go func() {
		defer close(c)
		wg.Wait()
	}()
	select {
	case <-c:
		return false // completed normally
	case <-time.After(timeout):
		return true // timed out
	}
}
