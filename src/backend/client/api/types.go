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

package api

import (
	authApi "alauda.io/diablo/src/backend/auth/api"
	settingsapi "alauda.io/diablo/src/backend/settings/api"
	restful "github.com/emicklei/go-restful"
	"k8s.io/api/authorization/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// ClientManager is responsible for initializing and creating clients to communicate with
// kubernetes apiserver on demand.
type ClientManager interface {
	Client(req *restful.Request) (kubernetes.Interface, error)
	DynamicClient(req *restful.Request, groupVersionKind *schema.GroupVersionKind) (dynamic.NamespaceableResourceInterface, error)
	InsecureClient() kubernetes.Interface
	CanI(req *restful.Request, ssar *v1.SelfSubjectAccessReview) bool
	Config(req *restful.Request) (*rest.Config, error)
	ClientCmdConfig(req *restful.Request, TSLskip bool) (clientcmd.ClientConfig, error)
	HasAccess(authInfo api.AuthInfo) error
	VerberClient(req *restful.Request) (ResourceVerber, error)
	SetTokenManager(manager authApi.TokenManager)
	SetAuthSettings(*settingsapi.AuthSettings)
}

// ResourceVerber is responsible for performing generic CRUD operations on all supported resources.
type ResourceVerber interface {
	Put(kind string, namespaceSet bool, namespace string, name string,
		object *runtime.Unknown) error
	Get(kind string, namespaceSet bool, namespace string, name string) (runtime.Object, error)
	Delete(kind string, namespaceSet bool, namespace string, name string) error
}

// CanIResponse is used to as response to check whether or not user is allowed to access given endpoint.
type CanIResponse struct {
	Allowed bool `json:"allowed"`
}
