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

	"k8s.io/apimachinery/pkg/runtime"

	"github.com/golang/glog"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// MicroservicesComponentsGetter has a method to return a MicroservicesComponentInterface.
// A group's client should implement this interface.
type MicroservicesComponentsGetter interface {
	MicroservicesComponents(namespace string) MicroservicesComponentInterface
}

// MicroservicesComponentInterface has methods to work with MicroservicesComponent resources.
type MicroservicesComponentInterface interface {
	Update(*MicroservicesComponent) (*MicroservicesComponent, error)
	Get(name string, options metav1.GetOptions) (*MicroservicesComponent, error)
	List(opts metav1.ListOptions) (*MicroservicesComponentList, error)
}

// microservicesComponents implements MicroservicesComponentInterface
type microservicesComponents struct {
	resource dynamic.ResourceInterface
}

// newMicroservicesComponents returns a MicroservicesComponents
func newMicroservicesComponents(c *AsfV1alpha1Client, namespace string) *microservicesComponents {
	return &microservicesComponents{
		resource: c.DynamicClient(&schema.GroupVersionKind{
			Group:   AsfApiserverGroup,
			Version: AsfApiserverVersion,
			Kind:    MicroservicesComponentResourceKind,
		}).Namespace(namespace),
	}
}

// Get takes name of the microservicesComponent, and returns the corresponding microservicesComponent object, and an error if there is any.
func (c *microservicesComponents) Get(name string, options metav1.GetOptions) (result *MicroservicesComponent, err error) {
	result = &MicroservicesComponent{}
	unstruct, err := c.resource.Get(name, options)
	if err != nil {
		return nil, err
	}
	result, err = MicroservicesComponentFromUnstructured(unstruct)
	if err != nil {
		return nil, err
	}
	return
}

// List takes label and field selectors, and returns the list of MicroservicesComponents that match those selectors.
func (c *microservicesComponents) List(opts metav1.ListOptions) (result *MicroservicesComponentList, err error) {
	result = &MicroservicesComponentList{}

	result.Items = []MicroservicesComponent{}
	ulist, err := c.resource.List(opts)
	if err != nil {

		return result, err
	}

	if ulist != nil && len(ulist.Items) > 0 {

		ulist.EachListItem(func(obj runtime.Object) error {

			unstruct := obj.(*unstructured.Unstructured)

			comp, err := MicroservicesComponentFromUnstructured(unstruct)
			if err != nil {
				return err
			}

			result.Items = append(result.Items, *comp)
			return nil
		})

	}

	return result, err
}

// Update takes the representation of a microservicesComponent and updates it. Returns the server's representation of the microservicesComponent, and an error, if there is any.
func (c *microservicesComponents) Update(microservicesComponent *MicroservicesComponent) (result *MicroservicesComponent, err error) {
	result = &MicroservicesComponent{}
	unsctucturedComp, err := MicroservicesComponentToUnstructured(microservicesComponent)
	if err != nil {
		return nil, err
	}
	uc, err := c.resource.Update(unsctucturedComp, metav1.UpdateOptions{})
	if err != nil {
		return nil, err
	}

	result, err = MicroservicesComponentFromUnstructured(uc)
	return
}

func MicroservicesComponentToUnstructured(a *MicroservicesComponent) (*unstructured.Unstructured, error) {
	a.TypeMeta.Kind = MicroservicesComponentResourceKind
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

func MicroservicesComponentFromUnstructured(r *unstructured.Unstructured) (*MicroservicesComponent, error) {
	b, err := json.Marshal(r.Object)
	if err != nil {

		glog.Fatalf("error ReleaseFromUnstructured json marshal : %v ,%v", err, r)
		return nil, err
	}
	var a MicroservicesComponent
	if err := json.Unmarshal(b, &a); err != nil {
		glog.Fatalf("error ReleaseFromUnstructured Unmarshal: %v", err)
		return nil, err
	}
	a.TypeMeta.Kind = MicroservicesComponentResourceKind
	a.TypeMeta.APIVersion = versionedGroupName.Group + "/" + versionedGroupName.Version
	return &a, nil
}
