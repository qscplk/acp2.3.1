package servicegraph

import (
	"encoding/json"
	"math"
	"strings"

	"alauda.io/diablo/src/backend/integration/prometheus"
	"github.com/prometheus/common/model"
)

const (
	NODE_EDGE_TYPE     = "edge"
	NODE_WORKLOAD_TYPE = "workload"
	NODE_SERVICE_TYPE  = "service"
	Quantile50         = 0.50
	Quantile90         = 0.90
	Quantile99         = 0.99
)

type ServiceMetrics struct {
	StartTime           int                            `json:"start_time"`
	EndTime             int                            `json:"end_time"`
	Step                int                            `json:"step"`
	Type                string                         `json:"type"`
	Namespace           string                         `json:"namespace"`
	Service             string                         `json:"service,omitempty"`
	Workloads           []string                       `json:"workloads"`
	RequestCount        RequestCount                   `json:"request_count"`
	RequestRate         []*TimeStampMetrics            `json:"request_rate,omitempty"`
	ErrorRate           []*TimeStampMetrics            `json:"error_rate,omitempty"`
	RequestResponseTime map[string][]*TimeStampMetrics `json:"request_response_time,omitempty"`
}

type WorkloadMetrics struct {
	StartTime           int                            `json:"start_time"`
	EndTime             int                            `json:"end_time"`
	Step                int                            `json:"step"`
	Type                string                         `json:"type"`
	Namespace           string                         `json:"namespace"`
	Services            []string                       `json:"services,omitempty"`
	Workload            string                         `json:"workload"`
	RequestCountIn      RequestCount                   `json:"request_count_in"`
	RequestCountOut     RequestCount                   `json:"request_count_out"`
	RequestRateIn       []*TimeStampMetrics            `json:"request_rate_in,omitempty"`
	RequestRateOut      []*TimeStampMetrics            `json:"request_rate_out,omitempty"`
	ErrorRateIn         []*TimeStampMetrics            `json:"error_rate_in,omitempty"`
	ErrorRateOut        []*TimeStampMetrics            `json:"error_rate_out,omitempty"`
	RequestResponseTime map[string][]*TimeStampMetrics `json:"request_response_time,omitempty"`
}

type EdgeMetrics struct {
	QueryOptions *EdgeMetricsQueryOptions `json:"query_options"`
	RequestCount RequestCount             `json:"request_count"`
	RequestRate  []*TimeStampMetrics      `json:"request_rate,omitempty"`
	ErrorRate    []*TimeStampMetrics      `json:"error_rate,omitempty"`

	RequestResponseTime map[string][]*TimeStampMetrics `json:"request_response_time,omitempty"`
}

type EdgeMetricsQueryOptions struct {
	SourceNamespace string `json:"source_namespace"`
	TargetNamespace string `json:"target_namespace"`
	SourceWorkload  string `json:"source_workload"`
	SourceService   string `json:"source_service"`
	TargetWorkload  string `json:"target_workload"`
	TargetService   string `json:"target_service"`
	StartTime       int    `json:"start_time"`
	EndTime         int    `json:"end_time"`
	Step            int    `json:"step"`
	MetricsType     string `json:"metrics_type"`
	P8sURL          string `json:"-"`
}

type RequestCount struct {
	Http_2xx int32 `json:"http_2xx"`
	Http_3xx int32 `json:"http_3xx"`
	Http_4xx int32 `json:"http_4xx"`
	Http_5xx int32 `json:"http_5xx"`
}

type TimeStampMetrics struct {
	int64
	float64
}

// MarshalJSON implements json.Marshaler.
func (ts TimeStampMetrics) MarshalJSON() ([]byte, error) {
	return json.Marshal([]interface{}{ts.int64, ts.float64})
}

func GetServiceMetrics(namespace, service, workload string, startTime, endTime, step int, p8sURL string) (*ServiceMetrics, error) {
	promClient, err := prometheus.NewClient(p8sURL)
	if err != nil {
		return nil, err
	}
	sm := &ServiceMetrics{StartTime: startTime, EndTime: endTime, Step: step, Service: service, Namespace: namespace, Type: NODE_SERVICE_TYPE}
	sm.Workloads = promClient.GetServiceWorkloads(service, namespace, startTime, endTime)
	rci, err := promClient.GetServiceRequestCountIn(service, workload, namespace, startTime, endTime)
	if err != nil {
		return sm, err
	}

	// servide node no outbound
	sm.RequestCount = generateRequestCount(rci)

	rri, err := promClient.GetServiceRequestRateIn(service, workload, namespace, startTime, endTime, step)
	if err != nil {
		return sm, err
	}

	eri, err := promClient.GetServiceErrorRateIn(service, workload, namespace, startTime, endTime, step)
	if err != nil {
		return sm, err
	}

	populateServiceMetricsRequestRate(sm, rri, eri)

	histo := promClient.GetServiceRequestResponseTime(service, namespace, startTime, endTime, step)

	sm.RequestResponseTime = generateRequestResponseTime(histo, "")
	return sm, nil
}

func GetWorkloadMetrics(namespace, workload string, startTime, endTime, step int, p8sURL string) (*WorkloadMetrics, error) {
	promClient, err := prometheus.NewClient(p8sURL)
	if err != nil {
		return nil, err
	}
	wm := &WorkloadMetrics{StartTime: startTime, EndTime: endTime, Step: step, Namespace: namespace, Workload: workload, Type: NODE_WORKLOAD_TYPE}
	wm.Services = promClient.GetWorkloadServices(workload, namespace, startTime, endTime)
	rci, err := promClient.GetWorkloadRequestCountIn(workload, namespace, startTime, endTime)
	if err != nil {
		return wm, err
	}
	rco, err := promClient.GetWorkloadRequestCountOut(workload, namespace, startTime, endTime)
	if err != nil {
		return wm, err
	}
	populateWorkloadMetricsRequestCount(wm, rci, rco)

	rri, err := promClient.GetWorkloadRequestRateIn(workload, namespace, startTime, endTime, step)
	if err != nil {
		return wm, err
	}
	rro, err := promClient.GetWorkloadRequestRateOut(workload, namespace, startTime, endTime, step)
	if err != nil {
		return wm, err
	}

	eri, err := promClient.GetWorkloadErrorRateIn(workload, namespace, startTime, endTime, step)
	if err != nil {
		return wm, err
	}
	ero, err := promClient.GetWorkloadErrorRateOut(workload, namespace, startTime, endTime, step)
	if err != nil {
		return wm, err
	}

	populateWorkloadMetricsRequestRate(wm, rri, rro, eri, ero)

	histo := promClient.GetWorkloadRequestResponseTime(workload, namespace, startTime, endTime, step)

	wm.RequestResponseTime = generateRequestResponseTime(histo, "")

	return wm, nil
}

func GetEdgeMetrics(options *EdgeMetricsQueryOptions) (*EdgeMetrics, error) {

	promClient, err := prometheus.NewClient(options.P8sURL)
	if err != nil {
		return nil, err
	}

	queryLabels, queryErrorLabels := promClient.BuildEdgeQueryLabels(options.SourceWorkload, options.SourceNamespace, options.SourceService, options.TargetWorkload, options.TargetNamespace, options.TargetService)
	em := &EdgeMetrics{QueryOptions: options}
	rc, err := promClient.GetEdgeRequestCount(queryLabels, options.StartTime, options.EndTime)
	if err != nil {
		return em, err
	}
	em.RequestCount = generateRequestCount(rc)

	rr, err := promClient.GetEdgeRequestRate(queryLabels, options.StartTime, options.EndTime, options.Step)
	if err != nil {
		return em, err
	}
	if len(rr) != 0 {
		em.RequestRate = generateRequestRate(rr[0].Values)

	}

	er, err := promClient.GetEdgeErrorRate(queryErrorLabels, options.StartTime, options.EndTime, options.Step)
	if err != nil {
		return em, err
	}
	if len(er) != 0 {
		em.ErrorRate = generateRequestRate(er[0].Values)
	}

	histo := promClient.GetEdgeRequestResponseTime(options.SourceWorkload, options.SourceNamespace, options.SourceService, options.TargetWorkload, options.TargetNamespace, options.TargetService, options.StartTime, options.EndTime, options.Step)

	em.RequestResponseTime = generateRequestResponseTime(histo, options.SourceWorkload)

	return em, nil
}

func generateRequestCount(requestCount model.Vector) RequestCount {
	r := RequestCount{}
	for _, s := range requestCount {
		m := s.Metric
		lCode, ok := m["response_code"]
		if !ok || len(lCode) == 0 {
			continue
		}

		code := string(lCode)

		switch {
		case strings.HasPrefix(code, "2"):
			r.Http_2xx += int32(s.Value)
		case strings.HasPrefix(code, "3"):
			r.Http_3xx += int32(s.Value)
		case strings.HasPrefix(code, "4"):
			r.Http_4xx += int32(s.Value)
		case strings.HasPrefix(code, "5"):
			r.Http_5xx += int32(s.Value)
		}
	}
	return r
}

func generateRequestRate(requestRate []model.SamplePair) []*TimeStampMetrics {
	ts := make([]*TimeStampMetrics, 0, len(requestRate))
	for _, s := range requestRate {
		ts = append(ts, &TimeStampMetrics{s.Timestamp.Unix(), float64(s.Value)})
	}
	return ts
}

func populateWorkloadMetricsRequestCount(wm *WorkloadMetrics, requestCountIn, requestCountOut model.Vector) {
	wm.RequestCountIn = generateRequestCount(requestCountIn)
	wm.RequestCountOut = generateRequestCount(requestCountOut)
}

func populateWorkloadMetricsRequestRate(wm *WorkloadMetrics, requestRateIn, requestRateOut, errorRateIn, errorRateOut model.Matrix) {
	if len(requestRateIn) != 0 {
		samples := requestRateIn[0].Values
		wm.RequestRateIn = generateRequestRate(samples)
	}

	if len(requestRateOut) != 0 {
		samples := requestRateOut[0].Values
		wm.RequestRateOut = generateRequestRate(samples)
	}

	if len(errorRateIn) != 0 {
		samples := errorRateIn[0].Values
		wm.ErrorRateIn = generateRequestRate(samples)
	}

	if len(errorRateOut) != 0 {
		samples := errorRateOut[0].Values
		wm.ErrorRateOut = generateRequestRate(samples)
	}
}

func populateServiceMetricsRequestRate(sm *ServiceMetrics, requestRateIn, errorRateIn model.Matrix) {
	if len(requestRateIn) != 0 {
		samples := requestRateIn[0].Values
		sm.RequestRate = generateRequestRate(samples)
	}

	if len(errorRateIn) != 0 {
		samples := errorRateIn[0].Values
		sm.ErrorRate = generateRequestRate(samples)
	}

}

func generateRequestResponseTime(histo map[string]model.Matrix, sourceWorkload string) map[string][]*TimeStampMetrics {
	result := make(map[string][]*TimeStampMetrics)
	for k, m := range histo {

		for _, sample := range m {
			lb := sample.Metric

			if val, ok := lb["source_workload"]; ok && sourceWorkload != "" {

				if string(val) == sourceWorkload {
					result[k] = convertToTimeStampMetrics(sample.Values)
				}
			} else {
				result[k] = convertToTimeStampMetrics(sample.Values)
			}

		}
	}

	return result

}

func convertToTimeStampMetrics(requestRate []model.SamplePair) []*TimeStampMetrics {
	ts := make([]*TimeStampMetrics, 0, len(requestRate))
	for _, s := range requestRate {
		val := s.Value
		if math.IsNaN(float64(val)) {
			ts = append(ts, &TimeStampMetrics{s.Timestamp.Unix(), 0})
		} else {
			ts = append(ts, &TimeStampMetrics{s.Timestamp.Unix(), float64(s.Value)})
		}

	}
	return ts
}
