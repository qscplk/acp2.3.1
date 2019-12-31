package gateway

import (
	"os"
	"path"

	"alauda.io/diablo/src/backend/resource/common"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	Kind = "Gateway"

	SelectorGatewayKey   = "istio"
	SelectorGatewayValue = "ingressgateway"

	IstioServerProtocolHttp  = "HTTP"
	IstioServerProtocolHttps = "HTTPS"
)

var (
	GVK = schema.GroupVersionKind{
		Group:   common.IstioGroup,
		Version: common.IstioVersion,
		Kind:    Kind,
	}
	defaultAnnotationDomain = "asm." + common.GetLocalBaseDomain()
	annotationDomain        = defaultAnnotationDomain
)

func annotationKey(key string) string {
	return path.Join(annotationDomain, key)

}

func init() {
	if v := os.Getenv(common.IstioAnnotationDomainEnv); v != "" {
		annotationDomain = v
	}
}
