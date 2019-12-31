package chart

import (
	catalog "catalog-controller/pkg/apis/catalogcontroller/v1alpha1"
	catalogclient "catalog-controller/pkg/client/clientset/versioned"
	"log"

	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

//GetDetailOriginal func
func GetDetailOriginal(client catalogclient.Interface, name string) (*catalog.Chart, error) {
	log.Printf("Getting details of %s chart", name)
	detail, err := client.CatalogControllerV1alpha1().Charts().Get(name, v1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return detail, nil
}
