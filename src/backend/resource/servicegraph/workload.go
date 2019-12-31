package servicegraph

import (
	"log"
	"sort"
	"sync"
	"time"

	"k8s.io/apimachinery/pkg/labels"

	appsv1 "k8s.io/api/apps/v1"
	batch_v1 "k8s.io/api/batch/v1"
	batch_v1beta1 "k8s.io/api/batch/v1beta1"
	v1 "k8s.io/api/core/v1"

	"alauda.io/diablo/src/backend/resource/common"
	"k8s.io/client-go/kubernetes"
)

const (
	//  label name for istio app
	IstioLabelAPPName = "app"

	// label name for istio version
	IstioLabelVersionName = "version"

	IstioSidecarAnnotationName = "sidecar.istio.io/status"
)

// WorkloadListItem has the necessary information to display the console workload list
type WorkloadListItem struct {
	// Name of the workload
	// required: true
	// example: reviews-v1
	Name string `json:"name"`

	// Type of the workload
	// required: true
	// example: deployment
	Type string `json:"type"`

	// Creation timestamp (in RFC3339 format)
	// required: true
	// example: 2018-07-31T12:24:17Z
	CreatedAt string `json:"createdAt"`

	// Kubernetes ResourceVersion
	// required: true
	// example: 192892127
	ResourceVersion string `json:"resourceVersion"`

	// Define if Pods related to this Workload has an IstioSidecar deployed
	// required: true
	// example: true
	IstioSidecar bool `json:"istioSidecar"`

	// Workload labels
	Labels map[string]string `json:"labels"`

	// Define if Pods related to this Workload has the label App
	// required: true
	// example: true
	AppLabel bool `json:"appLabel"`

	// Define if Pods related to this Workload has the label Version
	// required: true
	// example: true
	VersionLabel bool `json:"versionLabel"`

	// Number of current workload pods
	// required: true
	// example: 1
	PodCount int `json:"podCount"`
}

type WorkloadOverviews []*WorkloadListItem

// Workload has the details of a workload
type Workload struct {
	WorkloadListItem

	// Number of desired replicas
	// required: true
	// example: 2
	Replicas int32 `json:"replicas"`

	// Number of available replicas
	// required: true
	// example: 1
	AvailableReplicas int32 `json:"availableReplicas"`

	// Number of unavailable replicas
	// required: true
	// example: 1
	UnavailableReplicas int32 `json:"unavailableReplicas"`

	// Pods bound to the workload
	Pods Pods `json:"pods"`

	// Services that match workload selector
	Services Services `json:"services"`

	DestinationServices []DestinationService `json:"destinationServices"`
}

func formatTime(t time.Time) string {
	return t.Format(time.RFC3339)
}

// DestinationService holds service identifiers used for workload dependencies
type DestinationService struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type Workloads []*Workload

func (workload *WorkloadListItem) ParseWorkload(w *Workload) {
	workload.Name = w.Name
	workload.Type = w.Type
	workload.CreatedAt = w.CreatedAt
	workload.ResourceVersion = w.ResourceVersion
	workload.IstioSidecar = w.Pods.HasIstioSideCar()
	workload.Labels = w.Labels
	workload.PodCount = len(w.Pods)

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = w.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = w.Labels[IstioLabelVersionName]
}

func (workload *Workload) ParseDeployment(d *appsv1.Deployment) {

	workload.Name = d.Name
	workload.Type = "Deployment"
	workload.Labels = d.Spec.Template.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(d.CreationTimestamp.Time)
	workload.ResourceVersion = d.ResourceVersion
	workload.Replicas = d.Status.Replicas
	workload.AvailableReplicas = d.Status.AvailableReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
}

func (workload *Workload) ParseReplicaSet(r *appsv1.ReplicaSet) {

	workload.Name = r.Name
	workload.Type = "ReplicaSet"
	workload.Labels = r.Spec.Template.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(r.CreationTimestamp.Time)
	workload.ResourceVersion = r.ResourceVersion
	workload.Replicas = r.Status.Replicas
	workload.AvailableReplicas = r.Status.AvailableReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
}

func (workload *Workload) ParseReplicationController(r *v1.ReplicationController) {

	workload.Name = r.Name
	workload.Type = "ReplicationController"
	workload.Labels = r.Spec.Template.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(r.CreationTimestamp.Time)
	workload.ResourceVersion = r.ResourceVersion
	workload.Replicas = r.Status.Replicas
	workload.AvailableReplicas = r.Status.AvailableReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
}

func (workload *Workload) ParseStatefulSet(s *appsv1.StatefulSet) {

	workload.Name = s.Name
	workload.Type = "StatefulSet"
	workload.Labels = s.Spec.Template.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(s.CreationTimestamp.Time)
	workload.ResourceVersion = s.ResourceVersion
	workload.Replicas = s.Status.Replicas
	workload.AvailableReplicas = s.Status.ReadyReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
}

func (workload *Workload) ParsePod(pod *v1.Pod) {

	workload.Name = pod.Name
	workload.Type = "Pod"
	workload.Labels = pod.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(pod.CreationTimestamp.Time)
	workload.ResourceVersion = pod.ResourceVersion

	var podReplicas, podAvailableReplicas int32
	podReplicas = 1
	podAvailableReplicas = 1

	// When a Workload is a single pod we don't have access to any controller replicas
	// On this case we differentiate when pod is terminated with success versus not running
	// Probably it might be more cases to refine here
	if pod.Status.Phase == "Succeed" {
		podReplicas = 0
		podAvailableReplicas = 0
	} else if pod.Status.Phase != "Running" {
		podAvailableReplicas = 0
	}

	workload.Replicas = podReplicas
	workload.AvailableReplicas = podAvailableReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
}

func (workload *Workload) ParseJob(job *batch_v1.Job) {

	workload.Name = job.Name
	workload.Type = "Job"
	workload.Labels = job.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(job.CreationTimestamp.Time)
	workload.ResourceVersion = job.ResourceVersion

	workload.Replicas = job.Status.Active + job.Status.Succeeded + job.Status.Failed
	workload.AvailableReplicas = job.Status.Active + job.Status.Succeeded

	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	workload.UnavailableReplicas = job.Status.Failed
}

func (workload *Workload) ParseCronJob(cnjb *batch_v1beta1.CronJob) {

	workload.Name = cnjb.Name
	workload.Type = "CronJob"
	workload.Labels = cnjb.Labels

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]

	workload.CreatedAt = formatTime(cnjb.CreationTimestamp.Time)
	workload.ResourceVersion = cnjb.ResourceVersion

	// We don't have the information of this controller
	// We will infer the number of replicas as the number of pods without succeed state
	// We will infer the number of available as the number of pods with running state
	// If this is not enough, we should try to fetch the controller, it is not doing now to not overload kiali fetching all types of controllers
	var podReplicas, podAvailableReplicas int32
	podReplicas = 0
	podAvailableReplicas = 0
	for _, pod := range workload.Pods {
		if pod.Status != "Succeeded" {
			podReplicas++
		}
		if pod.Status == "Running" {
			podAvailableReplicas++
		}
	}
	workload.Replicas = podReplicas
	workload.AvailableReplicas = podAvailableReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	if podReplicas > podAvailableReplicas {
		workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
	} else {
		// On this case a Job may have all pods terminated
		// Then it is not an unhealth condition
		workload.UnavailableReplicas = 0
	}
}

func (workload *Workload) ParsePods(controllerName string, controllerType string, pods []v1.Pod) {

	workload.Name = controllerName
	workload.Type = controllerType
	// We don't have the information of this controller
	// We will infer the number of replicas as the number of pods without succeed state
	// We will infer the number of available as the number of pods with running state
	// If this is not enough, we should try to fetch the controller, it is not doing now to not overload kiali fetching all types of controllers
	var podReplicas, podAvailableReplicas int32
	podReplicas = 0
	podAvailableReplicas = 0
	for _, pod := range pods {
		if pod.Status.Phase != "Succeeded" {
			podReplicas++
		}
		if pod.Status.Phase == "Running" {
			podAvailableReplicas++
		}
	}
	workload.Replicas = podReplicas
	workload.AvailableReplicas = podAvailableReplicas
	// Deployments/ReplicaSets have a different parameters to indicate unavailable
	// calculate "desired" - "current" sounds reasonable on this context
	if podReplicas > podAvailableReplicas {
		workload.UnavailableReplicas = workload.Replicas - workload.AvailableReplicas
	} else {
		// On this case a Job may have all pods terminated
		// Then it is not an unhealth condition
		workload.UnavailableReplicas = 0
	}
	// We fetch one pod as template for labels
	// There could be corner cases not correct, then we should support more controllers
	if len(pods) > 0 {
		workload.Labels = pods[0].Labels
		workload.CreatedAt = formatTime(pods[0].CreationTimestamp.Time)
		workload.ResourceVersion = pods[0].ResourceVersion
	}

	/** Check the labels app and version required by Istio in template Pods*/
	_, workload.AppLabel = workload.Labels[IstioLabelAPPName]
	_, workload.VersionLabel = workload.Labels[IstioLabelVersionName]
}

func (workload *Workload) SetPods(pods []v1.Pod) {
	workload.Pods.Parse(pods)
	workload.IstioSidecar = workload.Pods.HasIstioSideCar()
}

func (workload *Workload) SetServices(svcs []v1.Service) {
	workload.Services.Parse(svcs)
}

var controllerOrder = map[string]int{
	"Deployment":            6,
	"DeploymentConfig":      5,
	"ReplicaSet":            4,
	"ReplicationController": 3,
	"StatefulSet":           2,
	"Job":                   1,
	"DaemonSet":             0,
	"Pod":                   -1,
}

func controllerPriority(type1, type2 string) string {
	w1, e1 := controllerOrder[type1]
	if !e1 {
		log.Printf("This controller %s is assigned in a Pod and it's not properly managed", type1)
	}
	w2, e2 := controllerOrder[type2]
	if !e2 {
		log.Printf("This controller %s is assigned in a Pod and it's not properly managed", type2)
	}
	if w1 >= w2 {
		return type1
	} else {
		return type2
	}
}

func FetchWorkloads(client kubernetes.Interface, nsQuery *common.NamespaceQuery, labelSelector string) (Workloads, error) {

	var pods []v1.Pod
	var repcon []v1.ReplicationController
	var dep []appsv1.Deployment
	var repset []appsv1.ReplicaSet
	var fulset []appsv1.StatefulSet
	var jbs []batch_v1.Job
	var conjbs []batch_v1beta1.CronJob

	namespace := (*nsQuery).ToRequestParam()

	ws := Workloads{}

	wg := sync.WaitGroup{}
	wg.Add(7)
	errChan := make(chan error, 7)

	PodListChannel := common.GetPodListChannel(client, nsQuery, 7)
	DeploymentListChannel := common.GetDeploymentListChannel(client, nsQuery, 1)
	ReplicaSetListChannel := common.GetReplicaSetListChannel(client, nsQuery, 2)
	ReplicationControllerListChannel := common.GetReplicationControllerListChannel(client, nsQuery, 1)
	StatefulSetListChannel := common.GetStatefulSetListChannel(client, nsQuery, 1)
	CronJobListChannel := common.GetCronJobListChannel(client, nsQuery, 1)

	JobListChannel := common.GetJobListChannel(client, nsQuery, 1)

	go func() {
		defer wg.Done()
		var err error
		podsList := <-PodListChannel.List
		err = <-PodListChannel.Error
		if err != nil {
			log.Printf("Error fetching Pods per namespace %s: %s", namespace, err)
			errChan <- err
		}

		pods = podsList.Items
	}()

	go func() {
		defer wg.Done()
		var err error
		depsList := <-DeploymentListChannel.List
		err = <-DeploymentListChannel.Error
		if err != nil {
			log.Printf("Error fetching Deployments per namespace %s: %s", namespace, err)
			errChan <- err
		}
		dep = depsList.Items
	}()

	go func() {
		defer wg.Done()
		var err error

		ReplicaSetList := <-ReplicaSetListChannel.List
		err = <-ReplicaSetListChannel.Error
		if err != nil {
			log.Printf("Error fetching ReplicaSets per namespace %s: %s", namespace, err)
			errChan <- err
		}
		repset = ReplicaSetList.Items
	}()

	go func() {
		defer wg.Done()
		var err error
		ReplicationControllerList := <-ReplicationControllerListChannel.List
		err = <-ReplicationControllerListChannel.Error
		if err != nil {
			log.Printf("Error fetching GetReplicationControllers per namespace %s: %s", namespace, err)
			errChan <- err
		}
		repcon = ReplicationControllerList.Items
	}()

	go func() {
		defer wg.Done()
		var err error //
		StatefulSetList := <-StatefulSetListChannel.List
		err = <-StatefulSetListChannel.Error
		if err != nil {
			log.Printf("Error fetching StatefulSets per namespace %s: %s", namespace, err)
			errChan <- err
		}
		fulset = StatefulSetList.Items
	}()

	go func() {
		defer wg.Done()
		var err error
		CronJobList := <-CronJobListChannel.List
		err = <-CronJobListChannel.Error
		if err != nil {
			log.Printf("Error fetching CronJobs per namespace %s: %s", namespace, err)
			errChan <- err
		}
		conjbs = CronJobList.Items
	}()

	go func() {
		defer wg.Done()
		var err error
		JobList := <-JobListChannel.List
		err = <-JobListChannel.Error
		if err != nil {
			log.Printf("Error fetching Jobs per namespace %s: %s", namespace, err)
			errChan <- err
		}
		jbs = JobList.Items
	}()

	wg.Wait()
	if len(errChan) != 0 {
		err := <-errChan

		log.Printf("Error fetching workloads for namespace %s: %s", namespace, err)
		return ws, err
	}

	// Key: name of controller; Value: type of controller
	controllers := map[string]string{}

	// Find controllers from pods
	for _, pod := range pods {
		if len(pod.OwnerReferences) != 0 {
			for _, ref := range pod.OwnerReferences {
				if ref.Controller != nil && *ref.Controller {
					if _, exist := controllers[ref.Name]; !exist {
						controllers[ref.Name] = ref.Kind
					} else {
						if controllers[ref.Name] != ref.Kind {
							controllers[ref.Name] = controllerPriority(controllers[ref.Name], ref.Kind)
						}
					}
				}
			}
		} else {
			if _, exist := controllers[pod.Name]; !exist {
				// Pod without controller
				controllers[pod.Name] = "Pod"
			}
		}
	}

	// Resolve ReplicaSets from Deployments
	// Resolve ReplicationControllers from DeploymentConfigs
	// Resolve Jobs from CronJobs
	for cname, ctype := range controllers {
		if ctype == "ReplicaSet" {
			found := false
			iFound := -1
			for i, rs := range repset {
				if rs.Name == cname {
					iFound = i
					found = true
					break
				}
			}
			if found && len(repset[iFound].OwnerReferences) > 0 {
				for _, ref := range repset[iFound].OwnerReferences {
					if ref.Controller != nil && *ref.Controller {
						// Delete the child ReplicaSet and add the parent controller
						if _, exist := controllers[ref.Name]; !exist {
							controllers[ref.Name] = ref.Kind
						} else {
							if controllers[ref.Name] != ref.Kind {
								controllers[ref.Name] = controllerPriority(controllers[ref.Name], ref.Kind)
							}
						}
						delete(controllers, cname)
					}
				}
			}
		}
		if ctype == "ReplicationController" {
			found := false
			iFound := -1
			for i, rc := range repcon {
				if rc.Name == cname {
					iFound = i
					found = true
					break
				}
			}
			if found && len(repcon[iFound].OwnerReferences) > 0 {
				for _, ref := range repcon[iFound].OwnerReferences {
					if ref.Controller != nil && *ref.Controller {
						// Delete the child ReplicationController and add the parent controller
						if _, exist := controllers[ref.Name]; !exist {
							controllers[ref.Name] = ref.Kind
						} else {
							if controllers[ref.Name] != ref.Kind {
								controllers[ref.Name] = controllerPriority(controllers[ref.Name], ref.Kind)
							}
						}
						delete(controllers, cname)
					}
				}
			}
		}
		if ctype == "Job" {
			found := false
			iFound := -1
			for i, jb := range jbs {
				if jb.Name == cname {
					iFound = i
					found = true
					break
				}
			}
			if found && len(jbs[iFound].OwnerReferences) > 0 {
				for _, ref := range jbs[iFound].OwnerReferences {
					if ref.Controller != nil && *ref.Controller {
						// Delete the child Job and add the parent controller
						if _, exist := controllers[ref.Name]; !exist {
							controllers[ref.Name] = ref.Kind
						} else {
							if controllers[ref.Name] != ref.Kind {
								controllers[ref.Name] = controllerPriority(controllers[ref.Name], ref.Kind)
							}
						}
						// Jobs are special as deleting CronJob parent doesn't delete children
						// So we need to check that parent exists before to delete children controller
						cnExist := false
						for _, cnj := range conjbs {
							if cnj.Name == ref.Name {
								cnExist = true
								break
							}
						}
						if cnExist {
							delete(controllers, cname)
						}
					}
				}
			}
		}
	}

	// Cornercase, check for controllers without pods, to show them as a workload
	var selector labels.Selector
	var selErr error
	if labelSelector != "" {
		selector, selErr = labels.Parse(labelSelector)
		if selErr != nil {
			log.Printf("%s can not be processed as selector: %v", labelSelector, selErr)
		}
	}
	for _, d := range dep {
		selectorCheck := true
		if selector != nil {
			selectorCheck = selector.Matches(labels.Set(d.Spec.Template.Labels))
		}
		if _, exist := controllers[d.Name]; !exist && selectorCheck {
			controllers[d.Name] = "Deployment"
		}
	}
	for _, rs := range repset {
		selectorCheck := true
		if selector != nil {
			selectorCheck = selector.Matches(labels.Set(rs.Spec.Template.Labels))
		}
		if _, exist := controllers[rs.Name]; !exist && len(rs.OwnerReferences) == 0 && selectorCheck {
			controllers[rs.Name] = "ReplicaSet"
		}
	}

	for _, rc := range repcon {
		selectorCheck := true
		if selector != nil {
			selectorCheck = selector.Matches(labels.Set(rc.Spec.Template.Labels))
		}
		if _, exist := controllers[rc.Name]; !exist && len(rc.OwnerReferences) == 0 && selectorCheck {
			controllers[rc.Name] = "ReplicationController"
		}
	}
	for _, fs := range fulset {
		selectorCheck := true
		if selector != nil {
			selectorCheck = selector.Matches(labels.Set(fs.Spec.Template.Labels))
		}
		if _, exist := controllers[fs.Name]; !exist && selectorCheck {
			controllers[fs.Name] = "StatefulSet"
		}
	}

	// Build workloads from controllers
	var cnames []string
	for k := range controllers {
		cnames = append(cnames, k)
	}
	sort.Strings(cnames)
	for _, cname := range cnames {
		w := &Workload{
			Pods:     Pods{},
			Services: Services{},
		}
		ctype := controllers[cname]
		// Flag to add a controller if it is found
		cnFound := true
		switch ctype {
		case "Deployment":
			found := false
			iFound := -1
			for i, dp := range dep {
				if dp.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				selector := labels.Set(dep[iFound].Spec.Template.Labels).AsSelector()
				w.SetPods(FilterPodsForSelector(selector, pods))
				w.ParseDeployment(&dep[iFound])
			} else {
				log.Printf("Workload %s is not found as Deployment", cname)
				cnFound = false
			}
		case "ReplicaSet":
			found := false
			iFound := -1
			for i, rs := range repset {
				if rs.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				selector := labels.Set(repset[iFound].Spec.Template.Labels).AsSelector()
				w.SetPods(FilterPodsForSelector(selector, pods))
				w.ParseReplicaSet(&repset[iFound])
			} else {
				log.Printf("Workload %s is not found as ReplicaSet", cname)
				cnFound = false
			}
		case "ReplicationController":
			found := false
			iFound := -1
			for i, rc := range repcon {
				if rc.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				selector := labels.Set(repcon[iFound].Spec.Template.Labels).AsSelector()
				w.SetPods(FilterPodsForSelector(selector, pods))
				w.ParseReplicationController(&repcon[iFound])
			} else {
				log.Printf("Workload %s is not found as ReplicationController", cname)
				cnFound = false
			}
		case "StatefulSet":
			found := false
			iFound := -1
			for i, fs := range fulset {
				if fs.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				selector := labels.Set(fulset[iFound].Spec.Template.Labels).AsSelector()
				w.SetPods(FilterPodsForSelector(selector, pods))
				w.ParseStatefulSet(&fulset[iFound])
			} else {
				log.Printf("Workload %s is not found as StatefulSet", cname)
				cnFound = false
			}
		case "Pod":
			found := false
			iFound := -1
			for i, pod := range pods {
				if pod.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				w.SetPods([]v1.Pod{pods[iFound]})
				w.ParsePod(&pods[iFound])
			} else {
				log.Printf("Workload %s is not found as Pod", cname)
				cnFound = false
			}
		case "Job":
			found := false
			iFound := -1
			for i, jb := range jbs {
				if jb.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				selector := labels.Set(jbs[iFound].Spec.Template.Labels).AsSelector()
				w.SetPods(FilterPodsForSelector(selector, pods))
				w.ParseJob(&jbs[iFound])
			} else {
				log.Printf("Workload %s is not found as Job", cname)
				cnFound = false
			}
		case "CronJob":
			found := false
			iFound := -1
			for i, cjb := range conjbs {
				if cjb.Name == cname {
					found = true
					iFound = i
					break
				}
			}
			if found {
				selector := labels.Set(conjbs[iFound].Spec.JobTemplate.Spec.Template.Labels).AsSelector()
				w.SetPods(FilterPodsForSelector(selector, pods))
				w.ParseCronJob(&conjbs[iFound])
			} else {
				log.Printf("Workload %s is not found as CronJob (CronJob could be deleted but children are still in the namespace)", cname)
				cnFound = false
			}
		default:
			cPods := FilterPodsForController(cname, ctype, pods)
			w.SetPods(cPods)
			w.ParsePods(cname, ctype, cPods)
		}
		if cnFound {
			ws = append(ws, w)
		}
	}
	return ws, nil
}

func FilterPodsForSelector(selector labels.Selector, allPods []v1.Pod) []v1.Pod {
	var pods []v1.Pod
	for _, pod := range allPods {
		if selector.Matches(labels.Set(pod.ObjectMeta.Labels)) {
			pods = append(pods, pod)
		}
	}
	return pods
}

func FilterPodsForController(controllerName string, controllerType string, allPods []v1.Pod) []v1.Pod {
	var pods []v1.Pod
	for _, pod := range allPods {
		for _, ref := range pod.OwnerReferences {
			if ref.Controller != nil && *ref.Controller && ref.Name == controllerName && ref.Kind == controllerType {
				pods = append(pods, pod)
				break
			}
		}
	}
	return pods
}

func (ws Workloads) FindWorkload(workloadName string) (*Workload, bool) {

	if workloadName == "" || workloadName == Unknown {
		return nil, false
	}

	for _, wk := range ws {
		//fmt.Println(fmt.Sprintf(" %s,%s ", wk.Name, workloadName))
		if wk.Name == workloadName {
			return wk, true
		}
	}
	return nil, false

}

func (wl *Workload) GetApp() string {
	for _, pod := range wl.Pods {
		if pod.AppLabel && pod.App != "" {
			return pod.App
		}
	}
	return ""
}

func (wl *Workload) GetVersion() string {
	for _, pod := range wl.Pods {
		if pod.VersionLabel && pod.Version != "" {
			return pod.Version
		}
	}
	return ""
}
