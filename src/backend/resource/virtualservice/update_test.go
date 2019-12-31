package virtualservice

import (
	"encoding/json"
	"github.com/ghodss/yaml"
	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"testing"
)

const vsTpl = `
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: bookinfo-rule
  namespace: default
spec:
  hosts:
  - reviews.prod.svc.cluster.local
  - uk.bookinfo.com
  - eu.bookinfo.com
  gateways:
  - my-gateway
  - mesh # applies to all the sidecars in the mesh
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v1
      weight: 20
    - destination:
        host: reviews
        subset: v2
      weight: 80 
  - route:
    - destination:
        host: reviews
        subset: v3
`

const disabledVsTpl = `
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: bookinfo-rule
  namespace: default
  annotations:
    asm.alauda.io/disabled: "true"
    asm.alauda.io/hosts: "[\"reviews.prod.svc.cluster.local\", \"uk.bookinfo.com\", \"eu.bookinfo.com\"]"
spec:
  hosts:
  - "X-ASM-DISABLED-reviews.prod.svc.cluster.local"
  - "X-ASM-DISABLED-uk.bookinfo.com"
  - "X-ASM-DISABLED-eu.bookinfo.com"
  gateways:
  - my-gateway
  - mesh # applies to all the sidecars in the mesh
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v1
      weight: 20
    - destination:
        host: reviews
        subset: v2
      weight: 80 
  - route:
    - destination:
        host: reviews
        subset: v3
`

func TestValidate(t *testing.T) {
	jsonData, err := yaml.YAMLToJSON([]byte(vsTpl))
	assert.Nil(t, err)
	var vs = &unstructured.Unstructured{}
	assert.Nil(t, json.Unmarshal(jsonData, vs))
	assert.Nil(t, validateCreate("default", vs))
	assert.Nil(t, validateUpdate("default", "bookinfo-rule", vs))
}

func TestValidateDisabled(t *testing.T) {
	jsonData, err := yaml.YAMLToJSON([]byte(disabledVsTpl))
	assert.Nil(t, err)
	var vs = &unstructured.Unstructured{}
	assert.Nil(t, json.Unmarshal(jsonData, vs))
	assert.Nil(t, validateCreate("default", vs))
	assert.Nil(t, validateUpdate("default", "bookinfo-rule", vs))
}
