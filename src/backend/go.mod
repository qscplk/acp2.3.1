module alauda.io/diablo/src/backend

go 1.12

replace (
	alauda.io/app-core => bitbucket.org/mathildetech/app-core v1.3.5
	alauda.io/asm-controller => bitbucket.org/mathildetech/asm-controller v0.0.0-20190610031737-d6945dd1880a
	alauda.io/auth-controller => bitbucket.org/mathildetech/auth-controller2 v2.0.15+incompatible
	alauda.io/devops-apiserver => bitbucket.org/mathildetech/devops-apiserver v0.0.0-20190809085710-36161881e0a3
	alauda.io/project-migration => bitbucket.org/mathildetech/project-migration v0.1.2
	catalog-controller => bitbucket.org/mathildetech/catalog-controller v1.8.0
	github.com/Sirupsen/logrus => github.com/sirupsen/logrus v1.1.1
	github.com/appscode/jsonpatch => gomodules.xyz/jsonpatch/v2 v2.0.1
	k8s.io/client-go => k8s.io/client-go v0.0.0-20181126152608-d082d5923d3c
)

require (
	alauda.io/app-core v1.3.5
	alauda.io/asm-controller v1.9.2
	alauda.io/devops-apiserver v0.0.0-20190809085710-36161881e0a3
	alauda.io/project-migration v0.1.2
	bitbucket.org/mathildetech/pass v1.0.1
	bitbucket.org/mathildetech/themex v0.0.0-20190411030658-261577112b28
	catalog-controller v1.8.0
	github.com/Jeffail/gabs v1.4.0 // indirect
	github.com/alauda/cyborg v0.4.7
	github.com/clbanning/x2j v0.0.0-20180326210544-5e605d46809c // indirect
	github.com/coreos/go-oidc v2.0.0+incompatible
	github.com/docker/distribution v2.7.1+incompatible
	github.com/docker/spdystream v0.0.0-20181023171402-6480d4af844c // indirect
	github.com/elazarl/goproxy v0.0.0-20190421051319-9d40249d3c2f // indirect
	github.com/elazarl/goproxy/ext v0.0.0-20190421051319-9d40249d3c2f // indirect
	github.com/emicklei/go-restful v2.9.6+incompatible
	github.com/emicklei/go-restful-openapi v1.0.0
	github.com/franela/goblin v0.0.0-20181003173013-ead4ad1d2727 // indirect
	github.com/franela/goreq v0.0.0-20171204163338-bcd34c9993f8 // indirect
	github.com/ghodss/yaml v1.0.0
	github.com/go-openapi/spec v0.19.0 // indirect
	github.com/gogo/protobuf v1.2.1
	github.com/golang/glog v0.0.0-20160126235308-23def4e6c14b
	github.com/hudl/fargo v1.2.1-0.20180614092839-fce5cf495554
	github.com/igm/sockjs-go v2.0.0+incompatible // indirect
	github.com/jinzhu/now v1.0.0
	github.com/juju/errors v0.0.0-20190207033735-e65537c515d7 // indirect
	github.com/juju/loggo v0.0.0-20190526231331-6e530bcce5d8 // indirect
	github.com/juju/testing v0.0.0-20190429233213-dfc56b8c09fc // indirect
	github.com/miekg/dns v1.1.13 // indirect
	github.com/op/go-logging v0.0.0-20160315200505-970db520ece7 // indirect
	github.com/opencontainers/go-digest v1.0.0-rc1 // indirect
	github.com/pkg/errors v0.8.1
	github.com/pquerna/cachecontrol v0.0.0-20180517163645-1555304b9b35 // indirect
	github.com/prometheus/client_golang v0.9.3
	github.com/prometheus/common v0.4.0
	github.com/satori/go.uuid v1.2.1-0.20180103174451-36e9d2ebbde5
	github.com/spf13/cast v1.3.0
	github.com/spf13/pflag v1.0.3
	github.com/spf13/viper v1.4.0
	github.com/stretchr/testify v1.3.0
	golang.org/x/oauth2 v0.0.0-20190604053449-0f29369cfe45
	golang.org/x/text v0.3.2
	gopkg.in/gcfg.v1 v1.2.3 // indirect
	gopkg.in/igm/sockjs-go.v2 v2.0.0
	gopkg.in/square/go-jose.v2 v2.3.1
	gopkg.in/yaml.v2 v2.2.2
	istio.io/api v0.0.0-20181201011059-a4f4a1ff6ffa

	k8s.io/api v0.0.0-20181213150558-05914d821849

	k8s.io/apimachinery v0.0.0-20181201231028-18a5ff3097b4
	k8s.io/client-go v10.0.0+incompatible
	k8s.io/heapster v1.5.4
	sigs.k8s.io/controller-runtime v0.1.10
)
