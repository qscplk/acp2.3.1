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

// MicroservicesEnvironmentBindingsGetter has a method to return a MicroservicesEnvironmentBindingInterface.
// A group's client should implement this interface.
type MicroservicesEnvironmentBindingsGetter interface {
	MicroservicesEnvironmentBindings(namespace string) MicroservicesEnvironmentBindingInterface
}

// MicroservicesEnvironmentBindingInterface has methods to work with MicroservicesEnvironmentBinding resources.
type MicroservicesEnvironmentBindingInterface interface {
	Get(name string, options metav1.GetOptions) (*MicroservicesEnvironmentBinding, error)
	List(opts metav1.ListOptions) (*MicroservicesEnvironmentBindingList, error)
}

// microservicesEnvironmentBindings implements MicroservicesEnvironmentBindingInterface
type microservicesEnvironmentBindings struct {
	resource dynamic.ResourceInterface
}

// newMicroservicesEnvironmentBindings returns a MicroservicesEnvironmentBindings
func newMicroservicesEnvironmentBindings(c *AsfV1alpha1Client, namespace string) *microservicesEnvironmentBindings {
	return &microservicesEnvironmentBindings{
		resource: c.DynamicClient(&schema.GroupVersionKind{
			Group:   AsfApiserverGroup,
			Version: AsfApiserverVersion,
			Kind:    MicroservicesEnvironmentBindingResourceKind,
		}).Namespace(namespace),
	}
}

// Get takes name of the microservicesEnvironmentBinding, and returns the corresponding microservicesEnvironmentBinding object, and an error if there is any.
func (c *microservicesEnvironmentBindings) Get(name string, options metav1.GetOptions) (result *MicroservicesEnvironmentBinding, err error) {
	result = &MicroservicesEnvironmentBinding{}
	unstruct, err := c.resource.Get(name, options)
	if err != nil {
		return nil, err
	}
	result, err = MicroservicesEnvironmentBindingFromUnstructured(unstruct)
	if err != nil {
		return nil, err
	}
	return
}

// List takes label and field selectors, and returns the list of MicroservicesEnvironmentBindings that match those selectors.
func (c *microservicesEnvironmentBindings) List(opts metav1.ListOptions) (*MicroservicesEnvironmentBindingList, error) {
	result := &MicroservicesEnvironmentBindingList{}

	result.Items = []MicroservicesEnvironmentBinding{}

	uList, err := c.resource.List(opts)
	if err != nil {

		glog.Errorf("error occurs list bindings: %v ,errors: %v", result, err)
		return result, err
	}

	if uList != nil && len(uList.Items) > 0 {

		uList.EachListItem(func(obj runtime.Object) error {

			unstruct := obj.(*unstructured.Unstructured)

			comp, err := MicroservicesEnvironmentBindingFromUnstructured(unstruct)
			if err != nil {
				return err
			}

			result.Items = append(result.Items, *comp)

			return nil
		})

	}

	return result, err
}

func MicroservicesEnvironmentBindingToUnstructured(a *MicroservicesEnvironmentBinding) (*unstructured.Unstructured, error) {
	a.TypeMeta.Kind = MicroservicesEnvironmentBindingResourceKind
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

func MicroservicesEnvironmentBindingFromUnstructured(r *unstructured.Unstructured) (*MicroservicesEnvironmentBinding, error) {
	b, err := json.Marshal(r.Object)
	if err != nil {

		glog.Fatalf("error ReleaseFromUnstructured json marshal : %v ,%v", err, r)
		return nil, err
	}
	var a MicroservicesEnvironmentBinding
	if err := json.Unmarshal(b, &a); err != nil {
		glog.Fatalf("error ReleaseFromUnstructured Unmarshal: %v", err)
		return nil, err
	}
	a.TypeMeta.Kind = MicroservicesEnvironmentBindingResourceKind
	a.TypeMeta.APIVersion = versionedGroupName.Group + "/" + versionedGroupName.Version
	return &a, nil
}
