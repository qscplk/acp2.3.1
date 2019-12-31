package asmConfig

import (
	"alauda.io/diablo/src/backend/api"
	"k8s.io/client-go/dynamic"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var (
	asmConfigName = "asm-cluster-config"
)

type Pilot struct {
	TraceSampling float64 `json:"tracesampling"`
}

type Elasticsearch struct {
	URL      string `json:"url"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type IPRangesMode string

const (
	IncludeMode IPRangesMode = "include"
	ExcludeMode IPRangesMode = "exclude"
)

type IPRanges struct {
	Mode   IPRangesMode `json:"mode"`
	Ranges []string     `json:"ranges"`
}

type JaegerCollector struct {
	Image string `json:"image"`
}

// ClusterConfigSpec defines the desired state of ClusterConfig
type ClusterConfigSpec struct {
	Pilot                            *Pilot         `json:"pilot,omitempty"`
	IPRanges                         *IPRanges      `json:"ipranges,omitempty"`
	Elasticsearch                    *Elasticsearch `json:"elasticsearch,omitempty"`
	HiddenServiceNameInTracing       []string       `json:"hiddenServiceNamesInTracing,omitempty"`
	ForbiddenSidecarInjectNamespaces []string       `json:"forbiddenSidecarInjectNamespaces,omitempty"`
	JaegerURL                        string         `json:"jaegerURL,omitempty"`
	GrafanaURL                       string         `json:"grafanaURL,omitempty"`
	PrometheusURL                    string         `json:"prometheusURL,omitempty"`
}

// ClusterConfigStatus defines the observed state of ClusterConfig
type ClusterConfigStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

type ClusterConfig struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterConfigSpec   `json:"spec,omitempty"`
	Status ClusterConfigStatus `json:"status,omitempty"`
}

func GetClusterConfig(dyclient dynamic.NamespaceableResourceInterface, clusterName string) (*ClusterConfig, error) {

	if CachedConfig.IsExist(clusterName) {
		return CachedConfig.Get(clusterName), nil
	}

	unstruct, err := dyclient.Get(asmConfigName, api.GetOptionsInCache)
	if err != nil {
		return nil, err
	}

	config, err := ClusterConfigFromUnstructured(unstruct)
	if err != nil {
		return nil, err
	}

	CachedConfig.Put(clusterName, *config, 600)

	return config, err
}
