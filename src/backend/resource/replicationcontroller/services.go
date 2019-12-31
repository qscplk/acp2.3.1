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

package replicationcontroller

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/service"
	client "k8s.io/client-go/kubernetes"
)

// GetReplicationControllerServices returns list of services that are related to replication
// controller targeted by given name.
func GetReplicationControllerServices(client client.Interface, dsQuery *dataselect.DataSelectQuery,
	namespace, rcName string) (*service.ServiceList, error) {

	replicationController, err := client.CoreV1().ReplicationControllers(namespace).Get(rcName, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	channels := &common.ResourceChannels{
		ServiceList: common.GetServiceListChannel(client, common.NewSameNamespaceQuery(namespace), 1),
	}

	services := <-channels.ServiceList.List
	err = <-channels.ServiceList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	matchingServices := common.FilterNamespacedServicesBySelector(services.Items, namespace,
		replicationController.Spec.Selector)
	return service.CreateServiceList(matchingServices, nonCriticalErrors, dsQuery), nil
}
