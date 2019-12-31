package pipeline

import (
	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"k8s.io/client-go/kubernetes"
)

func HandlePipelineTestReport(client devopsclient.Interface, k8sclient kubernetes.Interface, opt *PipelineTestReportsOptions) (report PipelineTestReports, err error) {
	report = PipelineTestReports{
		Regression: make([]devopsv1alpha1.PipelineTestReportItem, 0),
		Failed:     make([]devopsv1alpha1.PipelineTestReportItem, 0),
		Skipped:    make([]devopsv1alpha1.PipelineTestReportItem, 0),
		Fixed:      make([]devopsv1alpha1.PipelineTestReportItem, 0),
		Passed:     make([]devopsv1alpha1.PipelineTestReportItem, 0),
	}

	pipelineTestReportOption := &devopsv1alpha1.PipelineTestReportOptions{
		Start: opt.Start,
		Limit: opt.Limit,
	}

	var (
		testResport *devopsv1alpha1.PipelineTestReport
	)

	if testResport, err = client.DevopsV1alpha1().Pipelines(opt.Namespace).GetTestReports(opt.Name, pipelineTestReportOption); err == nil {
		for _, item := range testResport.Items {
			if item.State == "REGRESSION" {
				report.Regression = append(report.Regression, item)
			} else if item.Status == "FAILED" && item.State != "REGRESSION" {
				report.Failed = append(report.Failed, item)
			} else if item.Status == "SKIPPED" {
				report.Skipped = append(report.Skipped, item)
			} else if item.State == "FIXED" {
				report.Fixed = append(report.Fixed, item)
			} else if item.Status == "PASSED" {
				report.Passed = append(report.Passed, item)
			}
		}

		if testResport.Summary != nil {
			summary := testResport.Summary
			report.Summary = PipelineTestReportSummary{
				ExistingFailed: summary.ExistingFailed,
				Failed:         summary.Failed,
				Fixed:          summary.Fixed,
				Passed:         summary.Passed,
				Regressions:    summary.Regressions,
				Skipped:        summary.Skipped,
				Total:          summary.Total,
			}
		}
	}

	return
}

func fetchReport(client devopsclient.Interface, k8sclient kubernetes.Interface, opt *PipelineTestReportsOptions, status string) (*devopsv1alpha1.PipelineTestReport, error) {
	pipelineTestReportOption := &devopsv1alpha1.PipelineTestReportOptions{
		Start: opt.Start,
		Limit: opt.Limit,
	}

	return client.DevopsV1alpha1().Pipelines(opt.Namespace).GetTestReports(opt.Name, pipelineTestReportOption)
}

type PipelineTestReportsOptions struct {
	Namespace string
	Name      string

	Start int `json:"start"`
	Limit int `json:"limit"`
}

type PipelineTestReports struct {
	Summary    PipelineTestReportSummary
	Regression []devopsv1alpha1.PipelineTestReportItem
	Failed     []devopsv1alpha1.PipelineTestReportItem
	Skipped    []devopsv1alpha1.PipelineTestReportItem
	Fixed      []devopsv1alpha1.PipelineTestReportItem
	Passed     []devopsv1alpha1.PipelineTestReportItem
}

// PipelineTestReportSummary test report summary
type PipelineTestReportSummary struct {
	// existing failed
	ExistingFailed int64
	// failed
	Failed int64
	// fixed
	Fixed int64
	// passed
	Passed int64
	// regressions
	Regressions int64
	// skipped
	Skipped int64
	// total
	Total int64
}
