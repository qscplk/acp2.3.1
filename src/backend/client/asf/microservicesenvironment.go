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
	"encoding/json"

	"github.com/golang/glog"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// MicroservicesEnvironmentsGetter has a method to return a MicroservicesEnvironmentInterface.
// A group's client should implement this interface.
type MicroservicesEnvironmentsGetter interface {
	MicroservicesEnvironments() MicroservicesEnvironmentInterface
}

// MicroservicesEnvironmentInterface has methods to work with MicroservicesEnvironment resources.
type MicroservicesEnvironmentInterface interface {
	Get(name string, options metav1.GetOptions) (*MicroservicesEnvironment, error)
	List(opts metav1.ListOptions) (*MicroservicesEnvironmentList, error)
}

// microservicesEnvironments implements MicroservicesEnvironmentInterface
type microservicesEnvironments struct {
	resource dynamic.ResourceInterface
}

// newMicroservicesEnvironments returns a MicroservicesEnvironments
func newMicroservicesEnvironments(c *AsfV1alpha1Client) *microservicesEnvironments {
	return &microservicesEnvironments{
		resource: c.DynamicClient(&schema.GroupVersionKind{
			Group:   AsfApiserverGroup,
			Version: AsfApiserverVersion,
			Kind:    MicroservicesEnvironmentResourceKind,
		}).Namespace(""),
	}
}

// Get takes name of the microservicesEnvironment, and returns the corresponding microservicesEnvironment object, and an error if there is any.
func (c *microservicesEnvironments) Get(name string, options metav1.GetOptions) (result *MicroservicesEnvironment, err error) {
	result = &MicroservicesEnvironment{}
	unstruct, err := c.resource.Get(name, options)
	if err != nil {
		return nil, err
	}
	result, err = MicroservicesEnvironmentFromUnstructured(unstruct)
	if err != nil {
		return nil, err
	}
	return
}

// List takes label and field selectors, and returns the list of MicroservicesEnvironments that match those selectors.
func (c *microservicesEnvironments) List(opts metav1.ListOptions) (result *MicroservicesEnvironmentList, err error) {
	result = &MicroservicesEnvironmentList{}
	result.Items = []MicroservicesEnvironment{}

	ulist, err := c.resource.List(opts)
	if err != nil {
		return result, err
	}

	if ulist != nil && len(ulist.Items) > 0 {

		ulist.EachListItem(func(obj runtime.Object) error {

			unstruct := obj.(*unstructured.Unstructured)

			env, err := MicroservicesEnvironmentFromUnstructured(unstruct)
			if err != nil {
				return err
			}

			result.Items = append(result.Items, *env)

			return nil
		})

	}

	return result, err
}

func MicroservicesEnvironmentToUnstructured(a *MicroservicesEnvironment) (*unstructured.Unstructured, error) {
	a.TypeMeta.Kind = MicroservicesEnvironmentResourceKind
	a.TypeMeta.APIVersion = versionedGroupName.Group + "/" + versionedGroupName.Version
	b, err := json.Marshal(a)
	if err != nil {
		return nil, err
	}
	var r unstructured.Unstructured
	if err := json.Unmarshal(b, &r.Object); err != nil {
		glog.Fatalf("error ReleaseToUnstructured: %v", err)
		return nil, err
	}
	return &r, nil
}

func MicroservicesEnvironmentFromUnstructured(r *unstructured.Unstructured) (*MicroservicesEnvironment, error) {
	b, err := json.Marshal(r.Object)
	if err != nil {

		glog.Fatalf("error ReleaseFromUnstructured json marshal : %v ,%v", err, r)
		return nil, err
	}
	var a MicroservicesEnvironment
	if err := json.Unmarshal(b, &a); err != nil {
		glog.Fatalf("error ReleaseFromUnstructured Unmarshal: %v", err)
		return nil, err
	}
	a.TypeMeta.Kind = MicroservicesEnvironmentResourceKind
	a.TypeMeta.APIVersion = versionedGroupName.Group + "/" + versionedGroupName.Version
	return &a, nil
}
