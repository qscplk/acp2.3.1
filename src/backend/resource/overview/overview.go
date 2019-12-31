// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package overview

import (
	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/errors"
	metricapi "alauda.io/diablo/src/backend/integration/metric/api"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/config"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/discovery"
	"alauda.io/diablo/src/backend/resource/workload"
	"k8s.io/client-go/kubernetes"
)

// Overview is a list of objects present in a given namespace.
type Overview struct {
	// Inherits fields from the config, discovery, and workloads objects.
	config.Config       `json:",inline"`
	discovery.Discovery `json:",inline"`
	workload.Workloads  `json:",inline"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetOverview returns a list of all objects in a given namespace.
func GetOverview(client kubernetes.Interface, appCoreClient *appCore.ApplicationClient, metricClient metricapi.MetricClient,
	nsQuery *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (*Overview, error) {

	configResources, err := config.GetConfig(client, appCoreClient, nsQuery, dsQuery)
	if err != nil {
		return &Overview{}, err
	}

	discoveryResources, err := discovery.GetDiscovery(client, nsQuery, dsQuery)
	if err != nil {
		return &Overview{}, err
	}

	workloadsResources, err := workload.GetWorkloads(client, metricClient, nsQuery, dsQuery)
	if err != nil {
		return &Overview{}, err
	}

	return &Overview{
		Config: config.Config{
			ConfigMapList:             configResources.ConfigMapList,
			PersistentVolumeClaimList: configResources.PersistentVolumeClaimList,
			SecretList:                configResources.SecretList,
		},

		Discovery: discovery.Discovery{
			ServiceList: discoveryResources.ServiceList,
			IngressList: discoveryResources.IngressList,
		},

		Workloads: workload.Workloads{
			DeploymentList:            workloadsResources.DeploymentList,
			ReplicaSetList:            workloadsResources.ReplicaSetList,
			CronJobList:               workloadsResources.CronJobList,
			JobList:                   workloadsResources.JobList,
			ReplicationControllerList: workloadsResources.ReplicationControllerList,
			PodList:                   workloadsResources.PodList,
			DaemonSetList:             workloadsResources.DaemonSetList,
			StatefulSetList:           workloadsResources.StatefulSetList,
		},

		Errors: errors.MergeErrors(configResources.Errors, discoveryResources.Errors,
			workloadsResources.Errors),
	}, nil
}
