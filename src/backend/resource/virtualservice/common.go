package virtualservice

import (
	"os"
	"path"

	"alauda.io/diablo/src/backend/resource/common"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	disabledHostPrefix = "X-ASM-DISABLED-"
	HostName           = "asm.alauda.io/hostname"
	Kind               = "VirtualService"
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
