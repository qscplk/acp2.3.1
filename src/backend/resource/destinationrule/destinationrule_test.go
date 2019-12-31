package destinationrule

import (
	"encoding/json"
	"github.com/ghodss/yaml"
	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"testing"
)

const destinationruleTpl = `
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: asm-alauda-asm-test-http
  namespace: ftoo
spec:
  host: asm-test-http
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - labels:
      app: asm-test-http
      version: v1
    name: v1
  - labels:
      app: asm-test-http
      version: v2
    name: v2
  - labels:
      app: asm-test-http
      version: v3
    name: v3
`

func TestValidate(t *testing.T) {
	jsonData, err := yaml.YAMLToJSON([]byte(destinationruleTpl))
	assert.Nil(t, err)
	var destinationruleValide = &unstructured.Unstructured{}
	assert.Nil(t, json.Unmarshal(jsonData, destinationruleValide))
	assert.Nil(t, validateUpdate("ftoo", "asm-test-http", destinationruleValide))
}
