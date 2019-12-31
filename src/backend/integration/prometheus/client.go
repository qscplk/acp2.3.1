package prometheus

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	log "github.com/golang/glog"

	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
)

const (
	DefaultQuantile = 0.95

	ISTIO_REQUEST_TOTAL = "istio_requests_total"
)

// Client for Prometheus API.
// It hides the way we query Prometheus offering a layer with a high level defined API.
type Client struct {
	P8s api.Client
	Api v1.API
}

var clientMap = make(map[string]*Client)

// NewClient creates a new client to the Prometheus API.
// It returns an error on any problem.
func NewClient(p8sURL string) (*Client, error) {
	if clientMap[p8sURL] != nil {
		return clientMap[p8sURL], nil
	}

	p8s, err := api.NewClient(api.Config{Address: p8sURL})
	if err != nil {
		log.Errorf("p8s Client err %s", err)
		return nil, err
	}
	clientMap[p8sURL] = &Client{P8s: p8s, Api: v1.NewAPI(p8s)}
	return clientMap[p8sURL], nil
}

func getP8sURL() string {
	if os.Getenv("PROMETHEUS_URL") != "" {
		return os.Getenv("PROMETHEUS_URL")
	}
	return "http://prometheus.alauda-system:9090"
}

func (c *Client) Query(query string, queryTime time.Time) (model.Vector, error) {
	if "" == query {
		return model.Vector{}, fmt.Errorf("empty query")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	value, err := c.Api.Query(ctx, query, queryTime)
	if err != nil {
		return model.Vector{}, err
	}

	switch t := value.Type(); t {
	case model.ValVector: // Instant Vector
		return value.(model.Vector), nil
	default:
		return model.Vector{}, fmt.Errorf("No handling for type %v!\n", t)
	}
}

func (c *Client) QueryRange(query string, startTime, endTime time.Time, step int) (model.Matrix, error) {
	r := v1.Range{Start: startTime, End: endTime, Step: time.Duration(step) * time.Second}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	//fmt.Printf("query: %s \n", query)
	result, err := c.Api.QueryRange(ctx, query, r)
	if err != nil {
		return model.Matrix{}, fmt.Errorf("invalid query, matrix expected: %s", query)
	}
	switch result.Type() {
	case model.ValMatrix:
		return result.(model.Matrix), nil
	}
	return model.Matrix{}, fmt.Errorf("invalid query, matrix expected: %s", query)
}

func (c *Client) GetNamespaceTraffic(namespace string, startTime, endTime int) (model.Vector, error) {

	matix := model.Vector{}

	groupBy := "source_workload_namespace,source_workload,source_app,source_version,destination_service_namespace,destination_service_name,destination_workload,destination_workload_namespace,destination_app,destination_version,request_protocol,response_code,connection_security_policy,reporter"

	// 1. query for traffic originating from "unknown" (i.e. the internet).
	query := fmt.Sprintf(`sum(rate(%s{reporter="destination",source_workload="unknown",destination_service_namespace="%s"} [%vs])) by (%s)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		endTime-startTime, // range duration for the query
		groupBy)

	matix, err := c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		return model.Vector{}, err
	}

	// 2. traffic source in namespace
	query = fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace="%s"} [%vs])) by (%s)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		endTime-startTime,
		groupBy)

	result, err := c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		return model.Vector{}, err
	}
	matix = append(matix, result...)
	// 3. traffic destination in namespace
	query = fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace!="%s",source_workload!="unknown",destination_service_namespace="%s"} [%vs])) by (%s)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		namespace,
		endTime-startTime,
		groupBy)
	r, err := c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		return result, err
	}
	matix = append(matix, r...)

	query = fmt.Sprintf("sum(rate(%s{reporter=\"destination\",source_workload_namespace!=\"%v\",destination_service_namespace=\"%v\",connection_security_policy!=\"none\",response_code=~\"%v\"}[%vs]) > 0) by (%s)",
		ISTIO_REQUEST_TOTAL,
		namespace,
		namespace,
		"[2345][0-9][0-9]", // regex for valid response_codes
		endTime-startTime,  // range duration for the query
		groupBy)
	//fmt.Println(query)
	r, err = c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		fmt.Println(err)
		return result, err
	}
	matix = append(matix, r...)

	query = fmt.Sprintf("sum(rate(%s{reporter=\"destination\",source_workload_namespace=\"%v\",connection_security_policy!=\"none\",response_code=~\"%v\"}[%vs]) > 0) by (%s)",
		ISTIO_REQUEST_TOTAL,
		namespace,
		"[2345][0-9][0-9]", // regex for valid response_codes
		endTime-startTime,  // range duration for the query
		groupBy)

	//fmt.Println(query)
	r, err = c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {

		fmt.Println(err)
		return result, err
	}
	matix = append(matix, r...)

	return matix, nil
}

func (c *Client) GetAppRequestCountIn(app, namespace string, startTime, endTime int) (model.Vector, error) {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",destination_workload_namespace="%s",destination_app="%s"} [%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		app,
		endTime-startTime)
	//fmt.Printf("GetAppRequestCountIn: %s \n", query)
	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetAppRequestCountOut(app, namespace string, startTime, endTime int) (model.Vector, error) {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",source_workload_namespace="%s",source_app="%s"} [%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		app,
		endTime-startTime)
	//fmt.Printf("GetAppRequestCountOut: %s \n", query)
	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetAppRequestRateIn(app, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",destination_workload_namespace="%s",destination_app="%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		app,
		step)

	//fmt.Printf("GetAppRequestRateIn: %s \n", query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetAppRequestRateOut(app, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace="%s",source_app="%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		app,
		step)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetAppErrorRateIn(app, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",destination_workload_namespace="%s",destination_app="%s",response_code=~"%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		app,
		"[5|4].*",
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetAppErrorRateOut(app, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace="%s",source_app="%s",response_code=~"%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		app,
		"[5|4].*",
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetWorkloadRequestCountIn(workload, namespace string, startTime, endTime int) (model.Vector, error) {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",destination_workload_namespace="%s",destination_workload="%s"} [%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		endTime-startTime)
	//log.Info(query)
	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetWorkloadRequestCountOut(workload, namespace string, startTime, endTime int) (model.Vector, error) {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",source_workload_namespace="%s",source_workload="%s"} [%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		endTime-startTime)
	//log.Info(query)
	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetWorkloadRequestRateIn(workload, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`round(sum(rate(%s{reporter="source",destination_workload_namespace="%s",destination_workload="%s"} [%vs])),0.001)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetWorkloadRequestRateOut(workload, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace="%s",source_workload="%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetWorkloadErrorRateIn(workload, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",destination_workload_namespace="%s",destination_workload="%s",response_code=~"%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		"[5|4].*",
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetWorkloadErrorRateOut(workload, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace="%s",source_workload="%s",response_code=~"%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		"[5|4].*",
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) BuildEdgeQueryLabels(sourceWorkload, sourceNamespace, sourceService, targetWorkload, targetNamespace, targetService string) (string, string) {

	labels := []string{`reporter="source"`}

	if sourceWorkload != "" {
		labels = append(labels, fmt.Sprintf(`source_workload="%s"`, sourceWorkload))

	}

	if sourceNamespace != "" {
		labels = append(labels, fmt.Sprintf(`source_workload_namespace="%s"`, sourceNamespace))

	}

	if targetService != "" {
		// inbound only
		labels = append(labels, fmt.Sprintf(`destination_service_name="%s"`, targetService))
		if targetNamespace != "" {
			labels = append(labels, fmt.Sprintf(`destination_service_namespace="%s"`, targetNamespace))
		}
	} else if targetNamespace != "" {
		labels = append(labels, fmt.Sprintf(`destination_workload_namespace="%s"`, targetNamespace))
	}
	if targetWorkload != "" {
		labels = append(labels, fmt.Sprintf(`destination_workload="%s"`, targetWorkload))
	}

	full := "{" + strings.Join(labels, ",") + "}"

	labels = append(labels, `response_code=~"[5|4].*"`)
	errors := "{" + strings.Join(labels, ",") + "}"

	return full, errors

}

func (c *Client) GetEdgeRequestCount(queryLabel string, startTime, endTime int) (model.Vector, error) {
	var query string
	query = fmt.Sprintf(`sum(delta(%s%s[%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		queryLabel,
		endTime-startTime)

	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetEdgeRequestRate(queryLabel string, startTime, endTime, step int) (model.Matrix, error) {
	var query string
	query = fmt.Sprintf(`sum(rate(%s%s[%vs]))`,
		ISTIO_REQUEST_TOTAL,
		queryLabel,
		step)

	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetEdgeErrorRate(queryErrorLabel string, startTime, endTime, step int) (model.Matrix, error) {
	var query string
	query = fmt.Sprintf(`sum(rate(%s%s[%vs]))`,
		ISTIO_REQUEST_TOTAL,
		queryErrorLabel,
		step)

	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetWorkloadServices(workload, namespace string, startTime, endTime int) []string {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",destination_workload_namespace="%s",destination_workload="%s"} [%vs])) by (destination_service_name)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		workload,
		endTime-startTime)
	//log.Info(query)
	v, err := c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		return []string{}
	}

	result := make([]string, 0, len(v))
	for _, s := range v {
		result = append(result, string(s.Metric["destination_service_name"]))
	}
	return result
}

func (c *Client) GetServiceWorkloads(service, namespace string, startTime, endTime int) []string {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",destination_service_namespace="%s",destination_service_name="%s"} [%vs])) by (destination_workload)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		endTime-startTime)
	//log.Info(query)
	v, err := c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		return []string{}
	}

	result := make([]string, 0, len(v))
	for _, s := range v {
		result = append(result, string(s.Metric["destination_workload"]))
	}
	return result
}

func (c *Client) GetWorkloadLatency(workload, namespace string, startTime, endTime, step int, quantile float64) (model.Matrix, error) {

	if quantile <= 0.0 || quantile >= 100.0 {
		log.Infof("Replacing invalid quantile [%.2f] with default [%.2f]", quantile, DefaultQuantile)
		quantile = DefaultQuantile
	}
	log.Infof("Generating responseTime using quantile [%.2f]; namespace = %v", quantile, namespace)

	latencyQuery := fmt.Sprintf(`histogram_quantile(%.2f, sum(rate(istio_request_duration_seconds_bucket{destination_workload=~"%s.*", destination_workload_namespace=~"%s.*",reporter="destination"}[%vs])) by (le))`,
		quantile, workload, namespace, step)
	//log.Info(latencyQuery)
	return c.QueryRange(latencyQuery, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)

}

func (c *Client) GetAppRequestResponseTime(app, namespace string, startTime, endTime, step int) map[string]model.Matrix {
	params := IstioMetricsQuery{
		Namespace: namespace,
		App:       app,
		Direction: "inbound",
		Reporter:  "source",
		BaseMetricsQuery: BaseMetricsQuery{
			Range: v1.Range{
				End:   time.Unix(int64(endTime), 0),
				Start: time.Unix(int64(startTime), 0),
				Step:  time.Duration(step) * time.Second,
			},
			Quantiles:    []string{"0.5", "0.95", "0.99"},
			Avg:          true,
			ByLabels:     []string{""},
			RateInterval: fmt.Sprintf("%ds", step),
			RateFunc:     "rate",
		},
	}

	return getHistograms(c.Api, &params)
}

func (c *Client) GetEdgeRequestResponseTime(sourceWorkload, sourceNamespace, sourceService, targetWorkload, targetNamespace, targetService string, startTime, endTime, step int) map[string]model.Matrix {

	params := IstioMetricsQuery{
		Namespace: targetNamespace,
		Direction: "inbound",
		Reporter:  "source",
		BaseMetricsQuery: BaseMetricsQuery{
			Range: v1.Range{
				End:   time.Unix(int64(endTime), 0),
				Start: time.Unix(int64(startTime), 0),
				Step:  time.Duration(step) * time.Second,
			},
			Quantiles:    []string{"0.5", "0.95", "0.99"},
			Avg:          true,
			ByLabels:     []string{"source_workload"},
			RateInterval: fmt.Sprintf("%ds", step),
			RateFunc:     "rate",
		},
	}
	if targetWorkload != "" {
		params.Workload = targetWorkload
	} else {
		params.Service = targetService
	}

	if sourceService != "" {
		params.Reporter = "destination"
	}

	return getHistograms(c.Api, &params)

}

func (c *Client) GetWorkloadRequestResponseTime(workload, namespace string, startTime, endTime, step int) map[string]model.Matrix {
	params := IstioMetricsQuery{
		Namespace: namespace,
		Workload:  workload,
		Direction: "inbound",
		Reporter:  "source",
		BaseMetricsQuery: BaseMetricsQuery{
			Range: v1.Range{
				End:   time.Unix(int64(endTime), 0),
				Start: time.Unix(int64(startTime), 0),
				Step:  time.Duration(step) * time.Second,
			},
			Quantiles:    []string{"0.5", "0.95", "0.99"},
			Avg:          true,
			ByLabels:     []string{""},
			RateInterval: fmt.Sprintf("%ds", step),
			RateFunc:     "rate",
		},
	}

	return getHistograms(c.Api, &params)

}

func (c *Client) GetNodeTraffic(namespace, workload, service string, startTime, endTime int) (model.Vector, error) {

	matix := model.Vector{}
	// query prometheus for request traffic in two queries:
	// 1) query for incoming traffic
	var query string
	groupBy := "source_workload_namespace,source_workload,source_app,source_version,destination_service_namespace,destination_service_name,destination_workload,destination_app,destination_version,request_protocol,response_code"

	if workload != "" {

		query = fmt.Sprintf(`sum(rate(%s{reporter="source",destination_workload_namespace="%s",destination_workload="%s"} [%vs])) by (%s)`,
			ISTIO_REQUEST_TOTAL,
			namespace,
			workload,
			endTime-startTime, // range duration for the query
			groupBy)
	} else {
		// service node
		query = fmt.Sprintf(`sum(rate(%s{reporter="source",destination_service_namespace="%s",destination_service_name="%s", destination_workload="unknown"} [%vs])) by (%s)`,
			ISTIO_REQUEST_TOTAL,
			namespace,
			service,
			endTime-startTime, // range duration for the query
			groupBy)
	}

	matix, err := c.Query(query, time.Unix(int64(endTime), 0))
	if err != nil {
		return model.Vector{}, err
	}

	// 2) query for outbound traffic for workload, service no outbound traffic
	if workload != "" {

		query = fmt.Sprintf(`sum(rate(%s{reporter="source",source_workload_namespace="%s",source_workload="%s"} [%vs])) by (%s)`,
			ISTIO_REQUEST_TOTAL,
			namespace,
			workload,
			endTime-startTime, // range duration for the query
			groupBy)

		r, err := c.Query(query, time.Unix(int64(endTime), 0))
		if err != nil {
			return matix, err
		}
		matix = append(matix, r...)
	}

	return matix, nil

}

func (c *Client) GetServiceRequestCountIn(service, workload, namespace string, startTime, endTime int) (model.Vector, error) {

	workloadLabel := ""
	if workload != "" {
		workloadLabel = fmt.Sprintf(", destination_workload='%s'", workload)
	}
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",destination_service_namespace="%s",destination_service_name="%s" %s} [%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		workloadLabel,
		endTime-startTime)
	//fmt.Printf("GetServiceRequestCountIn: %s \n", query)
	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetServiceRequestCountOut(service, namespace string, startTime, endTime int) (model.Vector, error) {
	query := fmt.Sprintf(`sum(delta(%s{reporter="source",source_service_namespace="%s",source_service="%s"} [%vs])) by (response_code)`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		endTime-startTime)
	//fmt.Printf("GetServiceRequestCountOut: %s \n", query)
	return c.Query(query, time.Unix(int64(endTime), 0))
}

func (c *Client) GetServiceRequestRateIn(service, workload, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	workloadLabel := ""
	if workload != "" {
		workloadLabel = fmt.Sprintf(", destination_workload='%s'", workload)
	}

	query := fmt.Sprintf(`sum(rate(%s{reporter="source",destination_service_namespace="%s",destination_service_name="%s" %s} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		workloadLabel,
		step)

	//fmt.Printf("GetAppRequestRateIn: %s \n", query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetServiceRequestRateOut(service, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",source_service_namespace="%s",source_service_name="%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		step)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetServiceErrorRateIn(service, workload, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	workloadLabel := ""
	if workload != "" {
		workloadLabel = fmt.Sprintf(", destination_workload='%s'", workload)
	}
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",destination_service_namespace="%s",destination_service_name="%s",response_code=~"%s" %s}[%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		"[5|4].*",
		workloadLabel,
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetServiceErrorRateOut(service, namespace string, startTime, endTime, step int) (model.Matrix, error) {
	query := fmt.Sprintf(`sum(rate(%s{reporter="source",source_service_namespace="%s",source_service_name="%s",response_code=~"%s"} [%vs]))`,
		ISTIO_REQUEST_TOTAL,
		namespace,
		service,
		"[5|4].*",
		step)
	//log.Info(query)
	return c.QueryRange(query, time.Unix(int64(startTime), 0), time.Unix(int64(endTime), 0), step)
}

func (c *Client) GetServiceRequestResponseTime(service, namespace string, startTime, endTime, step int) map[string]model.Matrix {
	params := IstioMetricsQuery{
		Namespace: namespace,
		Service:   service,
		Direction: "inbound",
		Reporter:  "source",
		BaseMetricsQuery: BaseMetricsQuery{
			Range: v1.Range{
				End:   time.Unix(int64(endTime), 0),
				Start: time.Unix(int64(startTime), 0),
				Step:  time.Duration(step) * time.Second,
			},
			Quantiles:    []string{"0.5", "0.95", "0.99"},
			Avg:          true,
			ByLabels:     []string{""},
			RateInterval: fmt.Sprintf("%ds", step),
			RateFunc:     "rate",
		},
	}

	return getHistograms(c.Api, &params)
}
