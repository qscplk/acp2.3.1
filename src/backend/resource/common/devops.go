package common

import (
	"fmt"
	"strings"

	backendapi "alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	rbac "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Annotator basic interface for product related annotations
type Annotator interface {
	GetProductAnnotations(metav1.ObjectMeta) metav1.ObjectMeta

	// TODO: see if this is necessary
	// SetDisplayName(metav1.ObjectMeta, string) metav1.ObjectMeta
	// SetDescription(metav1.ObjectMeta, string) metav1.ObjectMeta
}

const (
	// DevOpsAPIVersion version for api
	DevOpsAPIVersion = "devops.alauda.io/v1alpha1"
	// AuthAPIVersion version for api
	AUTH_APIVersion = "auth.alauda.io/v1alpha1"
	// ProductName product name
	ProductName = "Alauda DevOps"
	// AnnotationsKeyDisplayName displayName key for annotations
	AnnotationsKeyDisplayName = "alauda.io/displayName"
	// AnnotationsKeyDisplayNameEn english displayName key for annotations
	AnnotationsKeyDisplayNameEn = "alauda.io/displayName.en"
	// AnnotationsKeyDisplayNameZh Chinese displayName key for annotations
	AnnotationsKeyDisplayNameZh = "alauda.io/displayName.zh-CN"
	// AnnotationsKeyProduct product name key for annotations
	AnnotationsKeyProduct = "alauda.io/product"
	// AnnotationsKeyProductVersion product version key for annotations
	AnnotationsKeyProductVersion = "alauda.io/product.version"
	// AnnotationsKeyRoleVersion role version key for annotations
	AnnotationsKeyRoleVersion = "alauda.io/roleVersion"
	// AnnotationsKeyProject project key for annotations
	AnnotationsKeyProject = "alauda.io/project"
	// AnnotationsKeySecret secret key for annotations
	AnnotationsKeySecret = "alauda.io/secret"
	// AnnotationsKeyToolType tool type key for annotations
	AnnotationsKeyToolType = "alauda.io/toolType"
	// AnnotationsKeyToolType tool item type key for annotations
	AnnotationsKeyToolItemKind = "alauda.io/toolItemKind"
	// AnnotationsKeyToolType tool item type key for annotations
	AnnotationsKeyToolItemType = "alauda.io/toolItemType"
	// AnnotationsKeyToolType tool item type key for annotations
	AnnotationsKeyToolItemPublic = "alauda.io/toolItemPublic"
	// AnnotationsKeyCategories categories for anntations
	AnnotationsKeyCategories = "alauda.io/categories"
	// AnnotationsKeyMultiBranchCategory category for multibranch
	AnnotationsKeyMultiBranchCategory = "alauda.io/multiBranchCategory"
	// AnnotationsKeyMultiBranchName branch name for multibranch
	AnnotationsKeyMultiBranchName = "alauda.io/multiBranchName"
	// AnnotationsKeyMultiBranchBranchList branch list for multibranch
	AnnotationsKeyMultiBranchBranchList = "alauda.io/jenkins.branch"
	// AnnotationsKeyMultiBranchStaleBranchList stale branch list for multibranch
	AnnotationsKeyMultiBranchStaleBranchList = "alauda.io/jenkins.stale.branch"
	// AnnotationsKeyMultiBranchPRList pr list for multibranch
	AnnotationsKeyMultiBranchPRList = "alauda.io/jenkins.pr"
	// AnnotationsKeyMultiBranchStalePRList stale pr list for multibranch
	AnnotationsKeyMultiBranchStalePRList = "alauda.io/jenkins.stale.pr"

	// AnnotationsCommit commit ID for pipeline
	AnnotationsCommit = "alauda.io/commit"
	// AnnotationsPipelineConfigName pipeline config name
	AnnotationsPipelineConfigName = "alauda.io/pipelineConfig.name"
	// LabelDevopsAlaudaIOKey key used for specific Labels
	LabelDevopsAlaudaIOKey = "devops.alauda.io"
	// LabelDevopsAlaudaIOProjectKey key used for roles that are using in a project
	LabelDevopsAlaudaIOProjectKey = "devops.alauda.io/project"
	// RoleNameDeveloper  Role for developer-tester
	RoleNameDeveloper = "devops-developer"
	// RoleNameProjectManager Role for project manager
	RoleNameProjectManager = "devops-project-manager"
	// RoleNameAlaudaProjectManager Role for project manager
	RoleNameAlaudaProjectManager = "alauda_project_admin"
	// LabelApplicationKey key in label for application
	LabelApplicationKey    = "app"
	LabelPipelineConfigKey = ""
)

// DevOpsAnnotator creates product specific annotations
type DevOpsAnnotator struct {
	productVersion string
}

// make sure that this struct satisfies the interface
var _ Annotator = DevOpsAnnotator{}

// GetProductAnnotations add product related anotations
// will overwrite if already existing
func (d DevOpsAnnotator) GetProductAnnotations(meta metav1.ObjectMeta) metav1.ObjectMeta {
	if meta.Annotations == nil {
		meta.Annotations = map[string]string{}
	}
	meta.Annotations[AnnotationsKeyProduct] = ProductName
	meta.Annotations[AnnotationsKeyProductVersion] = d.productVersion
	return meta
}

// func IsDevopsRole(roleBinding rbac.RoleBinding) bool {
// 	if roleBinding.RoleRef.Kind != "ClusterRole" {
// 		return false
// 	}
// 	switch roleBinding.RoleRef.Name {
// 	case RoleNameProjectManager, RoleNameDeveloper:
// 		return true
// 	}
// 	return false
// }

func IsDevopsProjectAdmin(roleBinding rbac.RoleBinding) bool {
	if roleBinding.RoleRef.Kind != "ClusterRole" {
		return false
	}
	switch roleBinding.RoleRef.Name {
	case RoleNameAlaudaProjectManager:
		return true
	}
	return false
}

// Aggregator aggregator function for different kinds of resources
// used to aggregate resources using different
type Aggregator interface {
	ByLabelKey(key string) map[string][]Resource
}

// Lister a resource that lists subresources
type Lister interface {
	GetItems() []Resource
}

// Resource common functionality for resources
type Resource interface {
	GetObjectMeta() backendapi.ObjectMeta
}

// ResourceAggregator simple resource aggregator
type ResourceAggregator struct {
}

// ByLabelKey aggregates different resources for different key values
func (ResourceAggregator) ByLabelKey(key string, resources ...Resource) (values map[string][]Resource) {
	values = make(map[string][]Resource, len(resources))
	var (
		list []Resource
		ok   bool
	)
	for _, r := range resources {
		resVal := getLabelValue(key, r)
		if resVal == "" {
			continue
		}
		if list, ok = values[resVal]; !ok {
			list = []Resource{}
		}
		list = append(list, r)
		values[resVal] = list
	}
	return
}

func getLabelValue(key string, resource Resource) (val string) {
	if resource == nil || len(resource.GetObjectMeta().Labels) == 0 {
		return
	}
	val = resource.GetObjectMeta().Labels[key]
	return
}

// CloneMeta clean up an object meta and clone
func CloneMeta(obj metav1.ObjectMeta) (new metav1.ObjectMeta) {
	new = *obj.DeepCopy()
	new.ResourceVersion = ""
	new.UID = ""
	new.SelfLink = ""
	new.CreationTimestamp = metav1.Time{}
	return
}

// IsInSlice is string is in slice
func IsInSlice(slice []string, key string) bool {
	if len(slice) == 0 {
		return false
	}
	for _, v := range slice {
		if key == v {
			return true
		}
	}
	return false
}

func FilterByDisplaynameToLower(query *dataselect.DataSelectQuery) *dataselect.DataSelectQuery {
	if query == nil || query.FilterQuery == nil || len(query.FilterQuery.FilterByList) == 0 {
		return query
	}
	for i, f := range query.FilterQuery.FilterByList {
		if f.Property == dataselect.DisplayNameProperty {
			f.Value = dataselect.StdComparableString(strings.ToLower(fmt.Sprintf("%s", f.Value)))
			query.FilterQuery.FilterByList[i] = f
			break
		}
	}
	return query
}

// ConvertToListOptions convert dsQuery to a listOptions struct
func ConvertToListOptions(dsQuery *dataselect.DataSelectQuery) (ls metav1.ListOptions) {
	ls = backendapi.ListEverything
	if dsQuery == nil || dsQuery.FilterQuery == nil {
		return
	}
	for _, r := range dsQuery.FilterQuery.FilterByList {
		switch r.Property {
		case dataselect.LabelProperty:
			str := fmt.Sprintf("%s", r.Value)
			split := strings.Split(str, ":")
			if len(split) > 1 {
				ls.LabelSelector = fmt.Sprintf("%s=%s", split[0], split[1])
			}
		case dataselect.LabelEqualProperty:
			str := fmt.Sprintf("%s", r.Value)
			split := strings.Split(str, ":")
			if len(split) > 1 {
				ls.LabelSelector = fmt.Sprintf("%s==%s", split[0], split[1])
			}
		}
	}
	return
}

func MergeAnnotations(original, override map[string]string) map[string]string {
	if original == nil {
		original = make(map[string]string)
	}
	if override == nil {
		override = make(map[string]string)
	}
	for k, v := range override {
		original[k] = v
	}
	return original
}

// CheckDevOpsAPIVersion get
func CheckDevOpsAPIVersion(typeMeta metav1.TypeMeta) metav1.TypeMeta {
	typeMeta.APIVersion = DevOpsAPIVersion
	return typeMeta
}

// CheckAuthAPIVersion get
func CheckAuthAPIVersion(typeMeta metav1.TypeMeta) metav1.TypeMeta {
	typeMeta.APIVersion = AUTH_APIVersion
	return typeMeta
}
