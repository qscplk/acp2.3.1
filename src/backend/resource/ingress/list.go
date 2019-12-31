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

package ingress

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	extensions "k8s.io/api/extensions/v1beta1"
	client "k8s.io/client-go/kubernetes"
)

// Ingress - a single ingress returned to the frontend.
type Ingress struct {
	api.ObjectMeta `json:"objectMeta"`
	api.TypeMeta   `json:"typeMeta"`

	// External endpoints of this ingress.
	Endpoints []common.Endpoint `json:"endpoints"`
}

func (ing Ingress) GetObjectMeta() api.ObjectMeta {
	return ing.ObjectMeta
}

func (ing Ingress) GetName() string {
	return ing.ObjectMeta.Name
}

// IngressList - response structure for a queried ingress list.
type IngressList struct {
	api.ListMeta `json:"listMeta"`

	// Unordered list of Ingresss.
	Items []Ingress `json:"items"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

func (list *IngressList) GetItems() (res []common.Resource) {
	if list == nil {
		res = []common.Resource{}
	} else {
		res = make([]common.Resource, len(list.Items))
		for i, d := range list.Items {
			res[i] = d
		}
	}
	return
}

// GetIngressList returns all ingresses in the given namespace.
func GetIngressList(client client.Interface, namespace *common.NamespaceQuery,
	dsQuery *dataselect.DataSelectQuery) (*IngressList, error) {
	ingressList, err := client.Extensions().Ingresses(namespace.ToRequestParam()).List(api.ListEverything)

	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toIngressList(ingressList.Items, nonCriticalErrors, dsQuery), nil
}

// GetIngressListFromChannels - return all ingresses in the given namespace.
func GetIngressListFromChannels(channels *common.ResourceChannels, dsQuery *dataselect.DataSelectQuery) (*IngressList, error) {
	ingress := <-channels.IngressList.List
	err := <-channels.IngressList.Error

	nonCriticalErrors, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}

	return toIngressList(ingress.Items, nonCriticalErrors, dsQuery), nil
}

func getEndpoints(ingress *extensions.Ingress) []common.Endpoint {
	endpoints := make([]common.Endpoint, 0)
	if len(ingress.Status.LoadBalancer.Ingress) > 0 {
		for _, status := range ingress.Status.LoadBalancer.Ingress {
			endpoint := common.Endpoint{Host: status.IP}
			endpoints = append(endpoints, endpoint)
		}
	}
	return endpoints
}

func toIngress(ingress *extensions.Ingress) *Ingress {
	modelIngress := &Ingress{
		ObjectMeta: api.NewObjectMeta(ingress.ObjectMeta),
		TypeMeta:   api.NewTypeMeta(api.ResourceKindIngress),
		Endpoints:  getEndpoints(ingress),
	}
	return modelIngress
}

func toIngressList(ingresses []extensions.Ingress, nonCriticalErrors []error, dsQuery *dataselect.DataSelectQuery) *IngressList {
	newIngressList := &IngressList{
		ListMeta: api.ListMeta{TotalItems: len(ingresses)},
		Items:    make([]Ingress, 0),
		Errors:   nonCriticalErrors,
	}
	if len(ingresses) == 0 {
		return newIngressList
	}

	ingresCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(ingresses), dsQuery)
	ingresses = fromCells(ingresCells)
	newIngressList.ListMeta = api.ListMeta{TotalItems: filteredTotal}

	for _, ingress := range ingresses {
		newIngressList.Items = append(newIngressList.Items, *toIngress(&ingress))
	}

	return newIngressList
}

func ToIngressList(res []common.Resource) (list []Ingress) {
	var (
		ok bool
		cm Ingress
	)
	list = make([]Ingress, 0, len(res))
	for _, r := range res {
		if cm, ok = r.(Ingress); ok {
			list = append(list, cm)
		}
	}
	return
}
