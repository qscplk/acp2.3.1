package client

import (
	catalogclient "catalog-controller/pkg/client/clientset/versioned"

	appCore "alauda.io/app-core/pkg/app"
	asmclient "alauda.io/asm-controller/pkg/client/clientset/versioned/typed/asm/v1beta1"

	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	clientapi "alauda.io/diablo/src/backend/client/api"

	asfClient "alauda.io/diablo/src/backend/client/asf"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/project-migration/pkg/tools/restClient"
	"github.com/emicklei/go-restful"
	authClient "sigs.k8s.io/controller-runtime/pkg/client"
)

type devopsClient struct {
	*clientManager
}

var (
	AuthClientMap    = map[string]*authClient.Client{}
	AuthorizationMap = map[string]string{}
)

// NewDevopsClient constructs a new DevopsClient
func NewDevopsClientManager(kubeConfigPath, apiserverHost string, enableAnounymous bool, multiclusterhost string) clientapi.DevOpsClientManager {
	result := &devopsClient{
		clientManager: &clientManager{
			kubeConfigPath:   kubeConfigPath,
			apiserverHost:    apiserverHost,
			enableAnounymous: enableAnounymous,
			multiClusterHost: multiclusterhost,
		},
	}
	result.init()
	return result
}

var _ clientapi.DevOpsClientManager = &devopsClient{}

// DevOpsClient returns DevOpsClient
func (self *devopsClient) DevOpsClient(req *restful.Request) (devopsclient.Interface, error) {
	cfg, err := self.Config(req)
	if err != nil {
		return nil, err
	}
	cfg.ContentType = "application/json"
	cfg.AcceptContentTypes = "application/json"

	client, err := devopsclient.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}

	return client, nil
}

// CatalogClient returns CatalogClient
func (self *devopsClient) CatalogClient(req *restful.Request) (catalogclient.Interface, error) {
	cfg, err := self.Config(req)
	if err != nil {
		return nil, err
	}
	cfg.ContentType = "application/json"
	cfg.AcceptContentTypes = "application/json"
	return catalogclient.NewForConfig(cfg)
}

// AppCoreClient returns appcore client
func (self *devopsClient) AppCoreClient(req *restful.Request) (*appCore.ApplicationClient, error) {
	cfg, err := self.Config(req)
	if err != nil {
		return nil, err
	}
	cfg.ContentType = "application/json"
	cfg.AcceptContentTypes = "application/json"
	return appCore.NewClient(cfg, "", common.GetLocalBaseDomain())
}

// CatalogClient returns CatalogClient
func (self *devopsClient) ASFClient(req *restful.Request) (asfClient.AsfV1alpha1Interface, error) {
	cfg, err := self.Config(req)
	if err != nil {
		return nil, err
	}

	asfclient, err := asfClient.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}

	return asfclient, nil

}

func (client *devopsClient) ASMClient(req *restful.Request) (asmclient.AsmV1beta1Interface, error) {
	cfg, err := client.Config(req)
	if err != nil {
		return nil, err
	}
	c, err := asmclient.NewJSONClientForConfig(cfg)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// func (self *devopsClient) AuthClient(req *restful.Request)(client authClient.Client,err error){

//   newAuthorization:=req.HeaderParameter("Authorization")

//   log.Printf("New Authorization:%s\r\n\r\n",newAuthorization)

//   idToken, err := authApi.ParseJWTFromHeader(req)
//   if err != nil {
//     return client,err
//   }

//   email:=idToken.Email
//   log.Printf("email:%s\r\n\r\n",email)

//   oldAuthorization:=AuthorizationMap[email]
//   log.Printf("Old Authorization:%s\r\n\r\n",oldAuthorization)

//   //set cache look like air
//   if AuthClientMap[email]!=nil&&oldAuthorization!=""&&newAuthorization==oldAuthorization{
//     log.Printf("email:%s,token:%s has been cached.",email,oldAuthorization)
//     client=*AuthClientMap[email]
//   }else{
//     log.Println("Create auth client,because auth client is nil or authorization updated.")

//     cfg,err:=self.Config(req)
//     if err!=nil{
//       return client,err
//     }
//     cfg.ContentType = "application/json"
//     cfg.AcceptContentTypes = "application/json"
//     log.Printf("auth config create complete.")

//     //TODO
//     //must be killed
//     //ccfg, _ := clientcmd.BuildConfigFromFlags(self.apiserverHost, self.kubeConfigPath)

//     //create auth manager & client
//     mgr, err := manager.New(cfg, manager.Options{})

//     if mgr==nil||err!=nil{
//       print(err)
//       if mgr==nil{
//         log.Println("mgr is nil.")
//       }

//       return client,err
//     }

//     log.Printf("auth mgr create complete.")

//     //registry scheme
//     scheme := mgr.GetScheme()

//     if err = v1beta1.AddToScheme(scheme);err!=nil{
//       log.Print(err)
//       return client,err
//     }

//     // Setup Scheme for all resources
//     if err = authApis.AddToScheme(scheme); err != nil {
//       log.Print(err)
//       return client,err
//     }

//     // Setup all Controllers
//     if err = authController.AddToManager(mgr); err != nil {
//       log.Print(err)
//       return client,err
//     }

//     log.Printf("auth add scheme complete.")

//     //mcc:=mgr.GetCache()
//     //
//     //mccChan:=make(chan struct{})
//     //
//     //go mcc.Start(mccChan)
//     //
//     //mcc.WaitForCacheSync(mccChan)
//     //
//     //client := mgr.GetClient()
//     //
//     //log.Printf("create auth project client complete.")
//     //
//     //mccChan<- struct{}{}

//     client,err=authClient.New(cfg,authClient.Options{})

//     if err!=nil{
//       log.Println(err)
//       return client,err
//     }

//     AuthClientMap[email]=&client

//     AuthorizationMap[email]=newAuthorization

//     log.Printf("auth client create complete.")

//   }

//   return
// }

func (self *devopsClient) RestClient(req *restful.Request) (restClient.RClient, error) {
	cfg, err := self.Config(req)
	if err != nil {
		return nil, err
	}
	result := &restClient.RClientS{cfg}

	return result, nil
}
