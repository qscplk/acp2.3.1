package horizontalpodautoscaler

import (
	"encoding/json"
	"errors"

	appCore "alauda.io/app-core/pkg/app"

	"alauda.io/diablo/src/backend/api"
	autoscaling "k8s.io/api/autoscaling/v2beta1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func GetFormCore(app appCore.Application) ([]autoscaling.HorizontalPodAutoscaler, error) {
	list := make([]autoscaling.HorizontalPodAutoscaler, 0)
	for _, r := range app.Resources {
		if r.GetKind() == api.ResourceKindHorizontalPodAutoscaler {
			item, err := ConverToOriginal(&r)
			if err != nil {
				return list, err
			}
			list = append(list, *item)
		}
	}
	return list, nil
}

func ConverToOriginal(unstr *unstructured.Unstructured) (*autoscaling.HorizontalPodAutoscaler, error) {
	if unstr == nil {
		return nil, errors.New("input unstr is nil")
	}
	data, err := json.Marshal(unstr)
	if err != nil {
		return nil, err
	}
	output := &autoscaling.HorizontalPodAutoscaler{}
	err = json.Unmarshal(data, output)
	return output, err
}
