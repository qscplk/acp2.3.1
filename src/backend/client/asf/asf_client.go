/*
Copyright 2018 Alauda.io.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package asf

import (
	dc "github.com/alauda/cyborg/pkg/client"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	rest "k8s.io/client-go/rest"
)

type AsfV1alpha1Interface interface {
	DynamicClient(*schema.GroupVersionKind) dynamic.NamespaceableResourceInterface
	MicroservicesComponentsGetter
	MicroservicesEnvironmentsGetter
	MicroservicesEnvironmentBindingsGetter
}

// AsfV1alpha1Client is used to interact with features provided by the asf.alauda.io group.
type AsfV1alpha1Client struct {
	kc *dc.KubeClient
}

func (c *AsfV1alpha1Client) MicroservicesComponents(namespace string) MicroservicesComponentInterface {
	return newMicroservicesComponents(c, namespace)
}

func (c *AsfV1alpha1Client) MicroservicesEnvironments() MicroservicesEnvironmentInterface {
	return newMicroservicesEnvironments(c)
}

func (c *AsfV1alpha1Client) MicroservicesEnvironmentBindings(namespace string) MicroservicesEnvironmentBindingInterface {
	return newMicroservicesEnvironmentBindings(c, namespace)
}

// NewForConfig creates a new AsfV1alpha1Client for the given config.
func NewForConfig(c *rest.Config) (*AsfV1alpha1Client, error) {
	config := *c
	if err := setConfigDefaults(&config); err != nil {
		return nil, err
	}

	kc, err := dc.NewKubeClient(c, "default")
	if err != nil {
		return nil, err
	}
	return &AsfV1alpha1Client{kc}, nil
}

// NewForConfigOrDie creates a new AsfV1alpha1Client for the given config and
// panics if there is an error in the config.
func NewForConfigOrDie(c *rest.Config) *AsfV1alpha1Client {
	client, err := NewForConfig(c)
	if err != nil {
		panic(err)
	}
	return client
}

func setConfigDefaults(config *rest.Config) error {
	gv := SchemeGroupVersion
	config.GroupVersion = &gv
	config.APIPath = "/apis"
	config.ContentType = runtime.ContentTypeJSON

	return nil
}

// RESTClient returns a RESTClient that is used to communicate
// with API server by this client implementation.
func (c *AsfV1alpha1Client) DynamicClient(gvk *schema.GroupVersionKind) dynamic.NamespaceableResourceInterface {
	if c == nil {
		return nil
	}
	client, err := c.kc.ClientForGVK(*gvk)
	if err != nil {
		return nil
	}
	return client
}
