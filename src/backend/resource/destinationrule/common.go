package destinationrule

import (
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	Group                        = "networking.istio.io"
	Version                      = "v1alpha3"
	Kind                         = "DestinationRule"
	HostName                     = "asm.alauda.io/hostname"
	DestinationtuleAll           = "0"
	DestinationtuleWithPolicy    = "1"
	DestinationtuleWithoutPolicy = "2"
)

var (
	GVK = schema.GroupVersionKind{
		Group:   Group,
		Version: Version,
		Kind:    Kind,
	}
)
