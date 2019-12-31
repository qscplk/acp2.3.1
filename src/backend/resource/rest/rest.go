package rest

import "k8s.io/client-go/rest"

type VResult struct {
	rest.Result
}

func (vr VResult) ToResult() {
	vr.Raw()
}
