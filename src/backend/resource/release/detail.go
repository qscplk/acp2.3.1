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

package release

import (
	"catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
	"log"

	catalogclient "catalog-controller/pkg/client/clientset/versioned"

	appCore "alauda.io/app-core/pkg/app"
	"alauda.io/diablo/src/backend/api"

	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ReleaseDetails struct {
	*v1alpha1.Release
	Result appCore.Result `json:"result"`
}

func CreateRelease(client catalogclient.Interface, release *v1alpha1.Release) (*v1alpha1.Release, error) {
	return client.CatalogControllerV1alpha1().Releases(release.GetNamespace()).Create(release)
}

func DeleteRelease(client catalogclient.Interface, namespace, name string) error {
	log.Printf("Deleting %s release in %s namespace\n", name, namespace)
	return client.CatalogControllerV1alpha1().Releases(namespace).Delete(name, &v1.DeleteOptions{})
}

// GetReleaseDetail returns returns detailed information about a release
func GetReleaseDetail(client catalogclient.Interface, namespace, name string) (*ReleaseDetails, error) {
	log.Printf("Getting details of %s release in %s namespace\n", name, namespace)
	rawRelease, err := client.CatalogControllerV1alpha1().Releases(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	resultItems := make([]appCore.ResourceResult, 0, len(rawRelease.Status.Items))
	for _, item := range rawRelease.Status.Items {
		resultItem := v1alpha1.ConvertToAppcore(item)
		resultItems = append(resultItems, resultItem)
	}
	result := appCore.Result{
		Items: resultItems,
	}

	details := &ReleaseDetails{rawRelease, result}
	return details, nil
}
