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

package service

import (
	"log"

	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"k8s.io/api/core/v1"
	client "k8s.io/client-go/kubernetes"
)

// Service is a representation of a service.
type Service struct {
	ObjectMeta api.ObjectMeta `json:"objectMeta"`
	TypeMeta   api.TypeMeta   `json:"typeMeta"`

	// InternalEndpoint of all Kubernetes services that have the same label selector as connected Replication
	// Controller. Endpoint is DNS name merged with ports.
	InternalEndpoint common.Endpoint `json:"internalEndpoint"`

	// ExternalEndpoints of all Kubernetes services that have the same label selector as connected Replication
	// Controller. Endpoint is external IP address name merged with ports.
	ExternalEndpoints []common.Endpoint `json:"externalEndpoints"`

	// Label selector of the service.
	Selector map[string]string `json:"selector"`

	// Type determines how the service will be exposed.  Valid options: ClusterIP, NodePort, LoadBalancer
	Type v1.ServiceType `json:"type"`

	// ClusterIP is usually assigned by the master. Valid values are None, empty string (""), or
	// a valid IP address. None can be specified for headless services when proxying is not required
	ClusterIP string `json:"clusterIP"`
}

func (ing Service) GetObjectMeta() api.ObjectMeta {
	return ing.ObjectMeta
}

// ServiceList contains a list of services in the cluster.
type ServiceList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of services.
	Services []Service `json:"services"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

type ServiceNameList struct {
	ListMeta api.ListMeta `json:"listMeta"`

	// Unordered list of services.
	Services []string `json:"services"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *ServiceList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.Services))
		for i, d := range list.Services {
			res[i] = d
		}
	}
	return
}

// GetServiceList returns a list of all services in the cluster.
func GetServiceList(client client.Interface, nsQuery *common.NamespaceQuery,
	dsQuery *dataselect.DataSelectQuery) (*ServiceList, error) {
	log.Print("Getting list of all services in the cluster")

	channels := &common.ResourceChannels{
		ServiceList: common.GetServiceListChannel(client, nsQuery, 1),
	}

	return GetServiceListFromChannels(channels, dsQuery)
}

// GetServiceListFromChannels returns a list of all services in the cluster.
func GetServiceListFromChannels(channels *common.ResourceChannels,
	dsQuery *dataselect.DataSelectQuery) (*ServiceList, error) {
	services := <-channels.ServiceList.List
	err := <-channels.ServiceList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return CreateServiceList(services.Items, nonCriticalErrors, dsQuery), nil
}

// GetServiceNameListByProject returns a list of all names of services  base on project.
func GetServiceNameListByProject(client client.Interface, nsQuery *common.NamespaceQuery,
	dsQuery *dataselect.DataSelectQuery) (*ServiceNameList, error) {
	log.Print("Getting list of all services in the cluster")

	channels := &common.ResourceChannels{
		ServiceList: common.GetServiceListChannel(client, nsQuery, 1),
	}

	return GetServiceNameListFromChannels(channels, dsQuery)
}

// GetServiceNameListFromChannels returns a list of all names of services base on project.
func GetServiceNameListFromChannels(channels *common.ResourceChannels,
	dsQuery *dataselect.DataSelectQuery) (*ServiceNameList, error) {
	services := <-channels.ServiceList.List
	err := <-channels.ServiceList.Error
	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return CreateServiceNameList(services.Items, nonCriticalErrors, dsQuery), nil
}

func ToServiceList(res []common.Resource) (list []Service) {
	var (
		ok bool
		cm Service
	)
	list = make([]Service, 0, len(res))
	for _, r := range res {
		if cm, ok = r.(Service); ok {
			list = append(list, cm)
		}
	}
	return
}
