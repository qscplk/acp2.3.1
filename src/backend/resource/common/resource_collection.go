package common

import (
	apps "k8s.io/api/apps/v1"
	autoscaling "k8s.io/api/autoscaling/v2beta1"
	core "k8s.io/api/core/v1"
	extensions "k8s.io/api/extensions/v1beta1"
)

type ResourceCollection struct {
	Deployments                 []apps.Deployment
	DaemonSets                  []apps.DaemonSet
	StatefulSets                []apps.StatefulSet
	ReplicaSets                 []apps.ReplicaSet
	Pods                        []core.Pod
	Events                      []core.Event
	Services                    []core.Service
	Ingresses                   []extensions.Ingress
	HorizontalPodAutoscalerList []autoscaling.HorizontalPodAutoscaler
}
