package api

import (
	catalogclient "catalog-controller/pkg/client/clientset/versioned"

	appCore "alauda.io/app-core/pkg/app"

	asfClient "alauda.io/diablo/src/backend/client/asf"

	asmclient "alauda.io/asm-controller/pkg/client/clientset/versioned/typed/asm/v1beta1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/project-migration/pkg/tools/restClient"
	"github.com/emicklei/go-restful" // authClient "sigs.k8s.io/controller-runtime/pkg/client"
)

// DevOpsClientManager beside implementing ClientManager
// it needs to add some of its own methods
type DevOpsClientManager interface {
	ClientManager
	DevOpsClient(req *restful.Request) (devopsclient.Interface, error)
	CatalogClient(req *restful.Request) (catalogclient.Interface, error)
	ASFClient(req *restful.Request) (asfClient.AsfV1alpha1Interface, error)
	AppCoreClient(req *restful.Request) (*appCore.ApplicationClient, error)
	RestClient(req *restful.Request) (restClient.RClient, error)
	ASMClient(req *restful.Request) (asmclient.AsmV1beta1Interface, error)
}
