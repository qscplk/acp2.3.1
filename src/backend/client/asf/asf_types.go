package asf

import (
	"k8s.io/apimachinery/pkg/runtime/serializer"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	// AsfApiserverGroup as asf api group name
	AsfApiserverGroup = "asf.alauda.io"

	// AsfApiserverVersion as asf api version
	AsfApiserverVersion = "v1alpha1"

	// MicroservicesEnvironmentResourceKind is CRD kind of  MicroservicesEnvironment
	MicroservicesEnvironmentResourceKind = "MicroservicesEnvironment"
	//
	// MicroservicesComponentResourceKind is CRD kind of  MicroservicesComponent
	MicroservicesComponentResourceKind = "MicroservicesComponent"

	// MicroservicesEnvironmentBindingResourceKind is CRD kind of  MicroservicesEnvironmentBinding
	MicroservicesEnvironmentBindingResourceKind = "MicroservicesEnvironmentBinding"

	StatusUnCreate   string = "UnCreate"
	StatusCreated    string = "Created"
	StatusInstalling string = "Installing"
	StatusRunning    string = "Running"
	StatusPending    string = "Pending"
	StatusFailed     string = "Failed"
	StatusStopped    string = "Stopped"
)

var Scheme = runtime.NewScheme()
var Codecs = serializer.NewCodecFactory(Scheme)
var ParameterCodec = runtime.NewParameterCodec(Scheme)

var SchemeGroupVersion = schema.GroupVersion{Group: AsfApiserverGroup, Version: AsfApiserverVersion}

var versionedGroupName = schema.GroupVersion{Group: AsfApiserverGroup, Version: AsfApiserverVersion}

// kindToName for convert kind to name
var kindToName = map[string]string{
	MicroservicesEnvironmentResourceKind:        "microservicesEnvironments",
	MicroservicesComponentResourceKind:          "microservicesComponents",
	MicroservicesEnvironmentBindingResourceKind: "microservicesEnvironmentBindings",
}

// ASFAPIResource for asf CRDs
func ASFAPIResource(kind string, namespaced bool) *metav1.APIResource {
	return &metav1.APIResource{
		Kind:       kind,
		Name:       kindToName[kind],
		Group:      AsfApiserverGroup,
		Version:    AsfApiserverVersion,
		Namespaced: namespaced,
	}
}

type MicroservicesComponent struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MicroservicesComponentSpec   `json:"spec,omitempty"`
	Status MicroservicesComponentStatus `json:"status,omitempty"`
}

// MicroservicesComponentSpec defines the desired state of MicroservicesComponent
type MicroservicesComponentSpec struct {
	MicroservicesEnvironmentName string        `json:"microservicesEnvironmentName"`
	ChartName                    string        `json:"chartName"`
	ReleaseRef                   ResourceRef   `json:"releaseRef"`
	RawValues                    string        `json:"rawValues"`
	Value                        string        `json:"value"`
	Type                         int           `json:"type"`
	Order                        int           `json:"order"`
	StatefulSetRefs              []ResourceRef `json:"statefulSetRefs,omitempty"`
	DeploymentRefs               []ResourceRef `json:"deploymentRefs,omitempty"`
}

type ResourceRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// MicroservicesComponentStatus defines the observed state of MicroservicesComponent
type MicroservicesComponentStatus struct {
	Status             string                            `json:"status"` //error, running, stopped
	CurrentInstallStep int                               `json:"currentInstallStep"`
	TotalInstallSteps  int                               `json:"totalInstallSteps"`
	PodControllerInfo  MicroserviceCompPodControllerInfo `json:"podControllerInfo"`
	Conditions         *runtime.RawExtension             `json:"conditions,omitempty"`
}

type MicroserviceCompPodControllerInfo struct {
	Pending     int32 `json:"pending"`
	Desired     int32 `json:"desired"`
	Unavailable int32 `json:"unavailable"`
	Available   int32 `json:"available"`
}

type MicroservicesComponentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MicroservicesComponent `json:"items"`
}

type MicroservicesEnvironment struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MicroservicesEnvironmentSpec   `json:"spec,omitempty"`
	Status MicroservicesEnvironmentStatus `json:"status,omitempty"`
}

// MicroservicesEnvironmentSpec defines the desired state of MicroservicesEnvironment
type MicroservicesEnvironmentSpec struct {
	MicroservicesComponentRefs []MicroservicesComponentRef       `json:"microserviceComponentRefs"`
	Namespace                  *MicroserviceEnvironmentNamespace `json:"namespace"`
}

type MicroserviceEnvironmentNamespace struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type MicroservicesComponentRef struct {
	Name        string                            `json:"name"`
	Status      string                            `json:"status"`
	Host        *string                           `json:"hostpath"`
	IngressHost *string                           `json:"ingresshost"`
	SubValues   *map[string]*runtime.RawExtension `json:"subValues,omitempty"`
	Order       int                               `json:"order"`
	Type        int                               `json:"type"`
}

// MicroservicesEnvironmentStatus defines the observed state of MicroservicesEnvironment
type MicroservicesEnvironmentStatus struct {
	Status    string                                   `json:"status"`
	Reason    string                                   `json:"reason"`
	Namespace *MicroservicesEnvironmentNamespaceStatus `json:"namespace"`

	Components *MicroservicesEnvironmentComponentsStatus `json:"components"`
}

type MicroservicesEnvironmentNamespaceStatus struct {
	Status string `json:"status"`
	Name   string `json:"name"`
}

type MicroservicesEnvironmentComponentsStatus struct {
	Status string `json:"status"`
}

type MicroservicesEnvironmentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MicroservicesEnvironment `json:"items"`
}

type MicroservicesEnvironmentBinding struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MicroservicesEnvironmentBindingSpec   `json:"spec,omitempty"`
	Status MicroservicesEnvironmentBindingStatus `json:"status,omitempty"`
}

// MicroservicesEnvironmentBindingSpec defines the desired state of MicroservicesEnvironmentBinding
type MicroservicesEnvironmentBindingSpec struct {
	MicroservicesEnviromentRef MicroservicesEnviromentRef `json:"microservicesEnvironmentRef"`
}

type MicroservicesEnviromentRef struct {
	Name string `json:"name"`
}

// MicroservicesEnvironmentBindingStatus defines the observed state of MicroservicesEnvironmentBinding
type MicroservicesEnvironmentBindingStatus struct {
	Status     string                                     `json:"status"`
	Conditions []MicroservicesEnvironmentBindingCondition `json:"conditions"`
}

// MicroservicesEnvironmentBindingCondition jenkins binding condition clause
type MicroservicesEnvironmentBindingCondition struct {
	Type        string       `json:"type"`
	LastAttempt *metav1.Time `json:"lastAttempt"`
	Reason      string       `json:"reason,omitempty"`
	Message     string       `json:"message,omitempty"`
	Status      string       `json:"status"`
}

type MicroservicesEnvironmentBindingList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MicroservicesEnvironmentBinding `json:"items"`
}
