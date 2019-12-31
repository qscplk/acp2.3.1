package prometheus

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"sync"

	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
)

const (
	ISTIO_REQUEST_DURATION_SECONDS = "istio_request_duration_seconds"
)

var (
	invalidLabelCharRE = regexp.MustCompile(`[^a-zA-Z0-9_]`)
)

func getHistograms(api v1.API, q *IstioMetricsQuery) map[string]model.Matrix {
	labels, labelsError := buildLabelStrings(q)
	grouping := strings.Join(q.ByLabels, ",")
	histogram := fetchAllHisto(api, q, labels, labelsError, grouping)
	return histogram
}

func buildLabelStrings(q *IstioMetricsQuery) (string, string) {
	labels := []string{fmt.Sprintf(`reporter="%s"`, q.Reporter)}
	ref := "destination"
	if q.Direction == "outbound" {
		ref = "source"
	}

	if q.Service != "" {
		// inbound only
		labels = append(labels, fmt.Sprintf(`destination_service_name="%s"`, q.Service))
		if q.Namespace != "" {
			labels = append(labels, fmt.Sprintf(`destination_service_namespace="%s"`, q.Namespace))
		}
	} else if q.Namespace != "" {
		labels = append(labels, fmt.Sprintf(`%s_workload_namespace="%s"`, ref, q.Namespace))
	}
	if q.Workload != "" {
		labels = append(labels, fmt.Sprintf(`%s_workload="%s"`, ref, q.Workload))
	}
	if q.App != "" {
		labels = append(labels, fmt.Sprintf(`%s_app="%s"`, ref, q.App))
	}
	if q.RequestProtocol != "" {
		labels = append(labels, fmt.Sprintf(`request_protocol="%s"`, q.RequestProtocol))
	}

	full := "{" + strings.Join(labels, ",") + "}"

	labels = append(labels, `response_code=~"[5|4].*"`)
	errors := "{" + strings.Join(labels, ",") + "}"

	return full, errors
}

func fetchAllHisto(api v1.API, q *IstioMetricsQuery, labels, labelsError, grouping string) map[string]model.Matrix {
	var wg sync.WaitGroup

	metricChannel := make(chan map[string]model.Matrix, 4)

	fetchHisto := func(p8sFamilyName, quantile string, isAvg bool) {

		defer wg.Done()
		metric := make(map[string]model.Matrix)
		if isAvg {
			m, err := fetchHistogramAvgRange(api, p8sFamilyName, labels, grouping, &q.BaseMetricsQuery)
			if err != nil {
				metric["avg"] = nil
			} else {

				metric["avg"] = m

			}

		} else {
			m, err := fetchHistogramRange(api, p8sFamilyName, labels, grouping, quantile, &q.BaseMetricsQuery)
			if err != nil {
				metric[quantile] = nil
			} else {
				metric[quantile] = m

			}

		}
		metricChannel <- metric
	}

	histogram := make(map[string]model.Matrix)
	if q.Avg {
		wg.Add(1)
		go fetchHisto(ISTIO_REQUEST_DURATION_SECONDS, "", true)
	}
	for _, quantile := range q.Quantiles {
		// if filters is empty, fetch all anyway
		wg.Add(1)
		go fetchHisto(ISTIO_REQUEST_DURATION_SECONDS, quantile, false)
	}
	wg.Wait()
	close(metricChannel)
	for metric := range metricChannel {

		for k, m := range metric {
			//fmt.Printf("%s ,%v \n", k, *m)
			histogram[k] = m
		}

	}
	//fmt.Printf("end featch all histogram")
	return histogram
}

func fetchRateRange(api v1.API, metricName, labels, grouping string, q *BaseMetricsQuery) (model.Matrix, error) {
	var query string
	// Example: round(sum(rate(my_counter{foo=bar}[5m])) by (baz), 0.001)
	if grouping == "" {
		query = fmt.Sprintf("sum(%s(%s%s[%s]))", q.RateFunc, metricName, labels, q.RateInterval)
	} else {
		query = fmt.Sprintf("sum(%s(%s%s[%s])) by (%s)", q.RateFunc, metricName, labels, q.RateInterval, grouping)
	}
	query = roundSignificant(query, 0.001)
	return fetchRange(api, query, q.Range)
}

func fetchRange(api v1.API, query string, bounds v1.Range) (model.Matrix, error) {
	result, err := api.QueryRange(context.Background(), query, bounds)
	if err != nil {
		return nil, err
	}
	switch result.Type() {
	case model.ValMatrix:
		return result.(model.Matrix), nil
	}
	return nil, fmt.Errorf("Invalid query, matrix expected: %s", query)
}

func replaceInvalidCharacters(metricName string) string {
	// See https://github.com/prometheus/prometheus/blob/master/util/strutil/strconv.go#L43
	return invalidLabelCharRE.ReplaceAllString(metricName, "_")
}

// roundSignificant will output promQL that performs rounding only if the resulting value is significant, that is, higher than the requested precision
func roundSignificant(innerQuery string, precision float64) string {
	return fmt.Sprintf("round(%s, %f) > %f or %s", innerQuery, precision, precision, innerQuery)
}

func fetchHistogramAvgRange(api v1.API, metricName, labels, grouping string, q *BaseMetricsQuery) (model.Matrix, error) {

	groupingAvg := ""
	if grouping != "" {
		groupingAvg = fmt.Sprintf(" by (%s)", grouping)
	}
	// Average
	// Example: sum(rate(my_histogram_sum{foo=bar}[5m])) by (baz) / sum(rate(my_histogram_count{foo=bar}[5m])) by (baz)
	query := fmt.Sprintf("sum(rate(%s_sum%s[%s]))%s / sum(rate(%s_count%s[%s]))%s",
		metricName, labels, q.RateInterval, groupingAvg, metricName, labels, q.RateInterval, groupingAvg)
	query = roundSignificant(query, 0.001)
	//fmt.Printf("histogram Query: %s\n", query)
	return fetchRange(api, query, q.Range)

}

func fetchHistogramRange(api v1.API, metricName, labels, grouping, quantile string, q *BaseMetricsQuery) (model.Matrix, error) {

	groupingQuantile := ""
	if grouping != "" {
		groupingQuantile = fmt.Sprintf(",%s", grouping)
	}
	// Example: round(histogram_quantile(0.5, sum(rate(my_histogram_bucket{foo=bar}[5m])) by (le,baz)), 0.001)
	query := fmt.Sprintf("histogram_quantile(%s, sum(rate(%s_bucket%s[%s])) by (le%s))",
		quantile, metricName, labels, q.RateInterval, groupingQuantile)
	query = roundSignificant(query, 0.001)

	//fmt.Printf("histogram Query: %s\n", query)
	return fetchRange(api, query, q.Range)

}
