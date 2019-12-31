package servicegraph

import (
	"fmt"
	"hash/fnv"
	"log"
	"sort"
	"strings"

	"alauda.io/diablo/src/backend/resource/common"

	"alauda.io/diablo/src/backend/integration/prometheus"
	"github.com/prometheus/common/model"

	client "k8s.io/client-go/kubernetes"
)

const (
	Unknown          string = "unknown" // Istio unknown label value
	NodeTypeApp      string = "app"
	NodeTypeService  string = "service"
	NodeTypeUnknown  string = "unknown" // The special "unknown" traffic gen node
	NodeTypeWorkload string = "workload"

	ReporterTypeDestination string = "destination"
	MutualTLS               string = "mutual_tls"
)

type Graph struct {
	Namespace          string  `json:"namespace"`
	StartTime          int     `json:"start_time"`
	EndTime            int     `json:"end_time"`
	Nodes              []*Node `json:"nodes"`
	Edges              []*Edge `json:"edges"`
	InjectServiceNodes bool    `json:"-"`
}

type Node struct {
	Id              uint32            `json:"id"`
	Namespace       string            `json:"namespace"`
	Service         string            `json:"service"`
	NodeType        string            `json:"node_type,omitempty"`
	Workload        string            `json:"workload"`
	Version         string            `json:"version"`
	IsRoot          bool              `json:"is_root"`
	App             string            `json:"app"`
	HasIstioSideCar *bool             `json:"has_istio_sidecar,omitempty"`
	SvcList         map[string]string `json:"-"`
	HasTLS          *bool             `json:"has_TLS,omitempty"`
}

func (n *Node) handleUnknownApp() {

	workloadOk := IsValideIstioLabel(n.Workload)
	appOk := IsValideIstioLabel(n.App)

	// workload
	if !appOk && workloadOk {

		if strings.HasPrefix(n.Workload, "istio") {
			n.App = n.Workload
			return
		}

		n.App = fmt.Sprintf("unknown(wl_%s)", n.Workload)
		return
	}

	// node service type
	//serviceOk := IsValideIstioLabel(n.Service)
	/*if !appOk && serviceOk {
		n.App = fmt.Sprintf("unknown(svc_%s)", n.Service)

	}
	*/

	if n.Version == Unknown {
		n.Version = ""
	}

}

func (n *Node) handleSvcList() {

	if n.NodeType == NodeTypeWorkload && n.SvcList != nil {
		svcString := ""
		for svc, _ := range n.SvcList {
			svcString = fmt.Sprintf("%s,%s", svcString, svc)
		}

		svcString = strings.TrimLeft(svcString, ",")

		n.Service = svcString
	}

}

type Edge struct {
	SourceId    uint32  `json:"source_id"`
	TargetId    uint32  `json:"target_id"`
	RequestRate float64 `json:"request_rate"`
	ErrorRate   float64 `json:"error_rate"`
}

func GetGraph(k8sclient client.Interface, namespace string, startTime, endTime int, injectServiceNodes bool, p8sURL string) (*Graph, error) {

	nsQuery := common.NewSameNamespaceQuery(namespace)
	workloadsChan := make(chan Workloads)
	errChan := make(chan error)

	// 这里是启动协程去获取workloads,跟主线程获取prometheus的数据并行处理，
	go getWorkloads(k8sclient, nsQuery, workloadsChan, errChan)

	// 主线程获取prometheus数据
	promClient, err := prometheus.NewClient(p8sURL)
	if err != nil {
		return nil, err
	}
	metrics, err := promClient.GetNamespaceTraffic(namespace, startTime, endTime)
	if err != nil {
		return nil, err
	}

	workloads := <-workloadsChan

	graph := Graph{Namespace: namespace, StartTime: startTime, EndTime: endTime, InjectServiceNodes: injectServiceNodes}
	return populateGraph(&graph, &metrics, workloads), nil
}

func populateGraph(graph *Graph, vector *model.Vector, ws Workloads) *Graph {
	for _, s := range *vector {
		m := s.Metric
		lSourceWlNs, sourceWlNsOk := m["source_workload_namespace"]
		lSourceWl, sourceWlOk := m["source_workload"]
		lSourceApp, sourceAppOk := m["source_app"]
		lSourceVer, sourceVerOk := m["source_version"]
		lDestSvcNs, destSvcNsOk := m["destination_service_namespace"]
		lDestSvcName, destSvcNameOk := m["destination_service_name"]
		lDestWl, destWlOk := m["destination_workload"]
		lDestApp, destAppOk := m["destination_app"]
		lDestVer, destVerOk := m["destination_version"]
		lCode, codeOk := m["response_code"]
		lCsp, cspOk := m["connection_security_policy"]
		lRpt, rptOk := m["reporter"]

		if !sourceWlNsOk || !sourceWlOk || !sourceAppOk || !sourceVerOk || !destSvcNsOk || !destSvcNameOk || !destWlOk || !destAppOk || !destVerOk || !codeOk {
			log.Printf("Skipping %s, missing expected TS labels", m.String())
			continue
		}
		//fmt.Println(fmt.Sprintf("%s", m.String()))

		sourceWlNs := string(lSourceWlNs)
		sourceWl := string(lSourceWl)
		sourceApp := string(lSourceApp)
		sourceVer := string(lSourceVer)
		destSvcNs := string(lDestSvcNs)
		destSvcName := string(lDestSvcName)
		destWl := string(lDestWl)
		destApp := string(lDestApp)
		destVer := string(lDestVer)
		code := string(lCode)
		val := float64(s.Value)
		rpt := string(lRpt)

		csp := string(lCsp)
		hasTLS := false

		if cspOk && csp == MutualTLS {

			hasTLS = true

		}

		if rptOk {
			if rpt == ReporterTypeDestination && csp != "none" {
				// with quey condition, just ignoring tls metrics for rate counting.
				code = "000"
				val = 0
			}
		}

		_, sourceNodeType := graph.generateId(sourceWl, sourceWlNs, sourceApp, sourceVer, "")
		if sourceNodeType == NodeTypeUnknown {
			// generated id failed ,skip
			continue
		}

		_, destNodeType := graph.generateId(destWl, destSvcNs, destApp, destVer, destSvcName)
		if destNodeType == NodeTypeUnknown {
			// generated id failed ,skip
			continue
		}

		if graph.InjectServiceNodes && destNodeType == NodeTypeWorkload {
			graph.addTriffic(val, sourceWl, sourceWlNs, sourceApp, sourceVer, "", "", destSvcNs, "", "", destSvcName, code, ws, hasTLS)

			graph.addTriffic(val, "", destSvcNs, "", "", destSvcName, destWl, destSvcNs, destApp, destVer, destSvcName, code, ws, false)

		} else {
			graph.addTriffic(val, sourceWl, sourceWlNs, sourceApp, sourceVer, "", destWl, destSvcNs, destApp, destVer, destSvcName, code, ws, false)

		}

	}

	graph.setRootNodes()
	graph.sortNodes()
	return graph
}

func findWorkload(ns, wlNs, wl, nodeType string, ws Workloads) (isValided bool, wkl *Workload) {
	isValided = true
	var wk *Workload
	//fmt.Printf("ws: %v /n", ws)

	// serviceNode no workload but valided for graph
	if nodeType == NodeTypeService {
		return true, wk
	}

	// 只处理当前ns的workload,不在当前ns的节点认为是有效节点
	if ns == wlNs && IsValideIstioLabel(wl) {
		wkl, wlfind := ws.FindWorkload(wl)
		if !wlfind {
			//fmt.Printf("can't find workload %s /n", wl)
			isValided = false
		} else {
			wk = wkl
		}

	}

	return isValided, wk

}

func (graph *Graph) addTriffic(val float64, sourceWl, sourceWlNs, sourceApp, sourceVer, sourceService, destWl, destSvcNs, destApp, destVer, destSvcName, responseCode string, ws Workloads, hasTLS bool) {
	sourceId, sourceNodeType := graph.generateId(sourceWl, sourceWlNs, sourceApp, sourceVer, sourceService)
	if sourceNodeType == NodeTypeUnknown {
		// generated id failed ,skip
		return
	}
	targetId, destNodeType := graph.generateId(destWl, destSvcNs, destApp, destVer, destSvcName)
	if destNodeType == NodeTypeUnknown {
		// generated id failed ,skip
		return
	}
	// a destination service node with no incoming traffic , is dead.
	// This is caused by an edge case (pod life-cycle change) that we don't want to see.
	if !graph.InjectServiceNodes && destNodeType == NodeTypeService && val == 0 {
		return
	}

	hasSourceNode, hasDestNode := false, false

	sourceValided, sourceWorkload := findWorkload(graph.Namespace, sourceWlNs, sourceWl, sourceNodeType, ws)

	destValided, destWorkload := findWorkload(graph.Namespace, destSvcNs, destWl, destNodeType, ws)

	// 当destination不存在时，不在当前ns的source会被忽略掉。
	if sourceValided && (destValided || graph.Namespace == sourceWlNs) {
		hasSourceNode = true
		// no source service replace with sourceApp
		graph.addNode(sourceId, sourceWl, sourceWlNs, sourceApp, sourceVer, sourceApp, sourceNodeType, sourceWorkload, false)

	}
	// 当source不存在时，不在当前ns的dest会被忽略。
	if destValided && (sourceValided || graph.Namespace == destSvcNs) {
		hasDestNode = true
		graph.addNode(targetId, destWl, destSvcNs, destApp, destVer, destSvcName, destNodeType, destWorkload, hasTLS)

	}

	if hasSourceNode && hasDestNode {
		graph.addEdge(sourceId, targetId, responseCode, val)
	}
}

func (g *Graph) addNode(id uint32, workload, namespace, app, version, service, nodeType string, wk *Workload, hasTLS bool) (*Node, bool) {
	var foundNode *Node
	var isFound bool = false
	var hasIstioSideCar bool

	// always using app from workload
	if nodeType == NodeTypeWorkload && wk != nil {
		app = wk.GetApp()
		version = wk.GetVersion()

		// sidecar
		hasIstioSideCar = wk.Pods.HasIstioSideCar()
	}

	for _, n := range g.Nodes {
		if id == n.Id {
			foundNode = n
			isFound = true
		}
	}
	if !isFound {

		newNode := &Node{Id: id, Namespace: namespace, Service: service, Workload: workload, Version: version, App: app, NodeType: nodeType}

		g.Nodes = append(g.Nodes, newNode)

		foundNode = newNode
	}

	if foundNode.SvcList == nil {
		foundNode.SvcList = make(map[string]string)
	}

	foundNode.SvcList[service] = service

	if nodeType == NodeTypeService && (foundNode.HasTLS == nil || hasTLS) {

		foundNode.HasTLS = &hasTLS
	}

	if isFound && g.InjectServiceNodes && nodeType == NodeTypeService && workload != Unknown {
		foundNode.Workload = workload
	}

	if nodeType == NodeTypeWorkload {
		foundNode.HasIstioSideCar = &hasIstioSideCar
	}

	return foundNode, isFound
}

func (g *Graph) addEdge(sourceId, targetId uint32, code string, val float64) {
	for _, e := range g.Edges {
		if e.SourceId == sourceId && e.TargetId == targetId {
			e.RequestRate += val
			if strings.HasPrefix(code, "5") || strings.HasPrefix(code, "4") {
				e.ErrorRate += val
			}
			return
		}
	}
	e := &Edge{SourceId: sourceId, TargetId: targetId, RequestRate: val}
	if strings.HasPrefix(code, "5") || strings.HasPrefix(code, "4") {
		e.ErrorRate = val
	}
	g.Edges = append(g.Edges, e)
}

func (g Graph) generateId(workload, namespace, app, version, service string) (uint32, string) {

	h := fnv.New32a()

	// first, check for the special-case "unknown" source node
	if Unknown == namespace && Unknown == workload && Unknown == app && "" == service {

		log.Printf("unknown_source: namespace=[%s] workload=[%s] app=[%s] version=[%s] service=[%s] ", namespace, workload, app, version, service)
		h.Write([]byte(fmt.Sprintf("unknown_source")))
		// skip unknown source
		return h.Sum32(), NodeTypeUnknown
	}

	workloadOk := IsValideIstioLabel(workload)
	serviceOk := IsValideIstioLabel(service)

	// app or version invalided and workload service invalided, skip
	if !workloadOk && !serviceOk {
		log.Printf("Failed ID gen: namespace=[%s] workload=[%s] app=[%s] version=[%s] service=[%s] ", namespace, workload, app, version, service)
		return 0, NodeTypeUnknown
	}

	// workload invalided ,using service,
	//Currently we cannot support service node type ,skip
	if !workloadOk {
		h.Write([]byte(fmt.Sprintf("svc_%s_%s", namespace, service)))
		return h.Sum32(), NodeTypeService
		//log.Printf("Currently we cannot support service node type ,skip : namespace=[%s] workload=[%s] app=[%s] version=[%s] service=[%s] ", namespace, workload, app, version, service)
		//return 0, false
	}

	// workload as id
	h.Write([]byte(fmt.Sprintf("wl_%s_%s", namespace, workload)))
	return h.Sum32(), NodeTypeWorkload
}

// Node that is a source of an edge and not a target of any edge is a root.
func (g *Graph) setRootNodes() {
	for _, n := range g.Nodes {
		n.handleUnknownApp()
		n.handleSvcList()
		source := false
		target := false
		for _, e := range g.Edges {
			if e.SourceId == n.Id {
				source = true
			}
			if e.TargetId == n.Id && e.SourceId != e.TargetId {
				target = true
			}
		}
		if source && !target {
			n.IsRoot = true
		}
	}
}

func (g *Graph) sortNodes() {

	sort.Slice(g.Nodes, func(i, j int) bool {

		if g.Nodes[i].IsRoot {
			return true
		}
		if g.Nodes[j].IsRoot {
			return false
		}
		return g.Nodes[i].Id < g.Nodes[j].Id
	})
}

// IsValideIstioLabel just validates that a  label value is not empty or unknown
func IsValideIstioLabel(labelVal string) bool {
	return labelVal != "" && labelVal != Unknown
}

func handleMissLabels(node *Node, app, version string) {

	//fmt.Println(fmt.Sprintf("nodeApp %s,%s", node.App, app))
	if node.App != app {
		node.App = app
	}

	if node.Version != version {
		node.Version = version
	}
}

func GetNodeGraph(k8sclient client.Interface, namespace, workload, app, version, service, selectedNamespace string, startTime, endTime int, injectServiceNodes bool, p8sURL string) (*Graph, error) {
	nsQuery := common.NewSameNamespaceQuery(selectedNamespace)
	workloadsChan := make(chan Workloads)
	errChan := make(chan error)

	// 这里是启动协程去获取workloads,跟主线程获取prometheus的数据并行处理，
	go getWorkloads(k8sclient, nsQuery, workloadsChan, errChan)

	promClient, err := prometheus.NewClient(p8sURL)
	if err != nil {
		return nil, err
	}
	metrics, err := promClient.GetNodeTraffic(namespace, workload, service, startTime, endTime)
	if err != nil {
		return nil, err
	}

	workloads := <-workloadsChan

	wk, _ := workloads.FindWorkload(workload)

	graph := Graph{Namespace: selectedNamespace, StartTime: startTime, EndTime: endTime, InjectServiceNodes: injectServiceNodes}
	graph.NewNode(namespace, workload, app, version, service, wk)
	return populateGraph(&graph, &metrics, workloads), nil
}

func getWorkloads(k8sclient client.Interface, nsQuery *common.NamespaceQuery, workloadsChan chan Workloads, errChan chan error) {
	workloads, err := FetchWorkloads(k8sclient, nsQuery, "")

	if err != nil {
		log.Printf("Error fetching workloads for namespace %s: %s", nsQuery.ToRequestParam(), err)
		errChan <- err
	}
	workloadsChan <- workloads
}

func (g *Graph) NewNode(ns, wlk, app, version, service string, wk *Workload) *Node {

	id, nodeType := g.generateId(wlk, ns, app, version, service)

	node, _ := g.addNode(id, wlk, ns, app, version, service, nodeType, wk, false)

	return node

}
