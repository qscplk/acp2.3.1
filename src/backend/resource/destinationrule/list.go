package destinationrule

import (
	"alauda.io/diablo/src/backend/api"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"encoding/json"
	"fmt"
	"github.com/gogo/protobuf/jsonpb"
	"istio.io/api/networking/v1alpha3"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"strings"
)

type DestinationRuleDetailList struct {
	ListMeta         api.ListMeta                `json:"listMeta"`
	DestinationRules []unstructured.Unstructured `json:"destinationRules"`
	Errors           []error                     `json:"errors"`
}

type DestinationRuleCell struct {
	obj *unstructured.Unstructured
}

// validate Traffic Policy LoadBalancer is nil
func validateTrafficPolicy(destinationRule *v1alpha3.DestinationRule) bool {
	if destinationRule.TrafficPolicy == nil {
		return true
	}
	if destinationRule.TrafficPolicy.LoadBalancer == nil {
		return true
	}
	return false

}

// GetDestinationRuleList
func GetDestinationRuleList(dyclient dynamic.NamespaceableResourceInterface, namespace string, policyType string, dsQuery *dataselect.DataSelectQuery) (*DestinationRuleDetailList, error) {
	obj, err := dyclient.Namespace(namespace).List(api.ListEverything)
	if err != nil {
		return nil, err
	}

	items := obj.Items
	// return, donnot have policy array or have Policy array
	if policyType != DestinationtuleAll && len(items) > 0 {
		var drsWithPolicy []unstructured.Unstructured
		var drsWithoutPolicy []unstructured.Unstructured
		for _, value := range items {
			var data []byte
			if data, err = json.Marshal(value.Object["spec"]); err != nil {
				return nil, err
			}
			dr := &v1alpha3.DestinationRule{}
			if err = jsonpb.UnmarshalString(string(data), dr); err != nil {
				return nil, err
			}
			// set donnot have policy array and have Policy array
			if validateTrafficPolicy(dr) {
				drsWithoutPolicy = append(drsWithoutPolicy, value)
			} else {
				drsWithPolicy = append(drsWithPolicy, value)
			}
		}
		if policyType == DestinationtuleWithPolicy {
			items = drsWithPolicy
		} else if policyType == DestinationtuleWithoutPolicy {
			items = drsWithoutPolicy
		}
	}

	total := len(items)
	// sort and paginate
	if dsQuery != nil {
		cells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(items), dsQuery)
		items = fromCells(cells)
		total = filteredTotal
	}
	list := &DestinationRuleDetailList{
		ListMeta: api.ListMeta{
			TotalItems: total,
		},
		DestinationRules: items,
		Errors:           []error{},
	}
	return list, nil
}

func GetDestinationRuleByHostDetail(dyclient dynamic.NamespaceableResourceInterface, namespace string, hostName string) (*[]unstructured.Unstructured, error) {

	listOptions := convertToDetailOptions(hostName)
	obj, err := dyclient.Namespace(namespace).List(listOptions)
	if err != nil {
		return nil, err
	}
	if obj.Items == nil && len(obj.Items) == 0 {
		return nil, fmt.Errorf("%s", hostName)
	}

	return &obj.Items, nil
}

func (cell DestinationRuleCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.ASMHostName:
		values := cell.obj.GetLabels()[HostName]
		return dataselect.StdComparableString(values)
	case dataselect.LabelProperty:
		if len(cell.obj.GetLabels()) > 0 {
			values := []string{}
			for k, v := range cell.obj.GetLabels() {
				values = append(values, k+":"+v)
			}
			return dataselect.StdComparableLabel(strings.Join(values, ","))
		}
		return dataselect.StdComparableLabel("")
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(cell.obj.GetCreationTimestamp().Time)
	default:
		// if name is not supported then just return a constant dummy value, sort will have no effect.
		return nil
	}
}
func toCells(std []unstructured.Unstructured) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(std))
	for i := range std {
		cells[i] = DestinationRuleCell{obj: &std[i]}
	}
	return cells
}
func fromCells(cells []dataselect.DataCell) []unstructured.Unstructured {
	std := make([]unstructured.Unstructured, len(cells))
	for i := range std {
		std[i] = *cells[i].(DestinationRuleCell).obj
	}
	return std
}

func convertToDetailOptions(hostName string) (ls v1.ListOptions) {
	ls = api.ListEverything
	if hostName == "" {
		return
	}
	ls.LabelSelector = fmt.Sprintf("%s in (%s)", HostName, hostName)
	return ls
}
