package microservicescomponent

import (
	"log"

	asfClient "alauda.io/diablo/src/backend/client/asf"

	"alauda.io/diablo/src/backend/api"
	"k8s.io/client-go/kubernetes"

	"alauda.io/diablo/src/backend/errors"
)

func UpdateMicroservicesComponent(client asfClient.AsfV1alpha1Interface, namespace, name string, component *asfClient.MicroservicesComponent) (mscompDetail *asfClient.MicroservicesComponent, err error) {
	msComp, err := client.MicroservicesComponents(namespace).Update(component)
	if err != nil {
		log.Println("error while update microservice component", err)
	}

	_, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}
	return msComp, nil
}

func GetMicroservicesComponentDetail(client asfClient.AsfV1alpha1Interface, k8sclient kubernetes.Interface, namespace, name string) (mscompDetail *asfClient.MicroservicesComponent, err error) {
	mscomp, err := client.MicroservicesComponents(namespace).Get(name, api.GetOptionsInCache)
	if err != nil {
		log.Println("error while get microservice Components detail", err)

	}
	_, criticalError := errors.HandleError(err)
	if criticalError != nil {
		return nil, criticalError
	}
	return mscomp, nil
}
