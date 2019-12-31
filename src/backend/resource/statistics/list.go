package statistics

import (
	"alauda.io/diablo/src/backend/resource/codequalityproject"
	"encoding/json"
	"sync"
	"time"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
	"alauda.io/diablo/src/backend/resource/common"
	"alauda.io/diablo/src/backend/resource/dataselect"
	"alauda.io/diablo/src/backend/resource/pipeline"

	"sort"

	"github.com/golang/glog"
	"github.com/jinzhu/now"
)

// Statistics defines the number of successes/failures/total
type Statistics struct {
	Succ   int `json:"succ"`
	Failed int `json:"failed"`
	Total  int `json:"total"`
}

// PipelineStatistics defines the statistics of pipeline
type PipelineStatistics struct {
	Data []PipelineStatisticsData `json:"data"`
	Statistics
}

// PipelineStatisticsData defines data in PipelineStatistics
type PipelineStatisticsData struct {
	Time time.Time `json:"time"`
	Statistics
}

// StageStatistics defines the statistics of stage
type StageStatistics struct {
	Data []StageStatisticsData `json:"data"`
}

// StageStatisticsData defines data in StageStatistics
type StageStatisticsData struct {
	Name string `json:"name"`
	Statistics
}

type CodeQualityStatistics struct {
	OK            int                                    `json:"ok"`
	Warn          int                                    `json:"warn"`
	Error         int                                    `json:"error"`
	MetricSummary map[string]CodeQualityMetricStatistics `json:"metricSummary"`
}

type CodeQualityMetricStatistics struct {
	Name   string         `json:"name"`
	Levels map[string]int `json:"levelSummary"`
}

// GetPipelineStatistics get pipeline statistics
func GetPipelineStatistics(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery, startTime, endTime time.Time) (result *PipelineStatistics, err error) {
	glog.V(7).Infof("get pipeline statistics between %s and %s", startTime, endTime)
	result = &PipelineStatistics{
		Data: make([]PipelineStatisticsData, 0),
	}
	if !startTime.Before(endTime) {
		return
	}

	pipelineList, err := pipeline.GetPipelineList(client, namespace, dsQuery)
	if err != nil {
		glog.Errorf("error happen when get pipelines, err: %v", err)
		return
	}

	if pipelineList == nil || len(pipelineList.Items) == 0 {
		glog.V(7).Infof("no pipelines in this period")
		return
	}

	timePool := make(map[time.Time]*Statistics, 0)
	parsePipelinesToTimePool(pipelineList.Items, startTime, endTime, result, timePool)
	parseTimePoolToResult(timePool, result, startTime, endTime)

	return
}

// parsePipelinesToTimePool parse pipelines to time pool
func parsePipelinesToTimePool(pipelines []pipeline.Pipeline, startTime time.Time, endTime time.Time, result *PipelineStatistics, timePool map[time.Time]*Statistics) {
	var (
		succTotal, failedTotal, total = 0, 0, 0
	)
	glog.V(7).Infof("pipeline count: %d", len(pipelines))
	for _, pipe := range pipelines {
		// skip the pipeline which is not finished
		if !pipe.Status.Phase.IsFinalPhase() || pipe.Status.FinishedAt == nil {
			glog.V(7).Infof("pipeline %s is not finished", pipe.GetObjectMeta().Name)
			continue
		}

		// skip the pipeline which is not finished in the time range
		finishedAt := pipe.Status.FinishedAt.Time
		if finishedAt.Before(startTime) || finishedAt.After(endTime) {
			glog.V(7).Infof("pipeline %s is not in the time range", pipe.GetObjectMeta().Name)
			continue
		}

		total++
		beginningOfHour := now.New(finishedAt).BeginningOfHour()
		if val, ok := timePool[beginningOfHour]; !ok || val == nil {
			timePool[beginningOfHour] = &Statistics{}
		}

		if pipe.Status.Phase == devopsv1alpha1.PipelinePhaseComplete {
			succTotal++
			timePool[beginningOfHour].Succ++
			timePool[beginningOfHour].Total++
			continue
		}

		failedTotal++
		timePool[beginningOfHour].Failed++
		timePool[beginningOfHour].Total++
	}
	result.Succ = succTotal
	result.Failed = failedTotal
	result.Total = total
	return
}

// parseTimePoolToResult parse time pool to result
func parseTimePoolToResult(timePool map[time.Time]*Statistics, result *PipelineStatistics, startTime, endTime time.Time) {
	step := 1 * time.Hour
	for i := startTime; i.Before(endTime); i = i.Add(step) {
		data := PipelineStatisticsData{
			Time: now.New(i).BeginningOfHour(),
		}

		if val, ok := timePool[data.Time]; ok {
			data.Statistics = *val
		}
		result.Data = append(result.Data, data)
	}
}

// GetStageStatistics get stage statistics
func GetStageStatistics(client devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery, startTime, endTime time.Time) (result *StageStatistics, err error) {
	glog.V(5).Infof("get stage statistics between %s and %s", startTime, endTime)

	result = &StageStatistics{
		Data: make([]StageStatisticsData, 0),
	}
	if !startTime.Before(endTime) {
		return
	}

	pipelineList, err := pipeline.GetPipelineList(client, namespace, dsQuery)
	if err != nil {
		glog.Errorf("error happen when get pipelines, err: %v", err)
		return
	}

	if pipelineList == nil || len(pipelineList.Items) == 0 {
		glog.V(7).Infof("no pipelines in this period")
		return
	}
	glog.V(7).Infof("pipeline's count: %d", len(pipelineList.Items))

	var (
		stagePool = &sync.Map{}
		wg        sync.WaitGroup
	)
	for _, pipe := range pipelineList.Items {
		// skip the pipeline which is not finished
		if !pipe.Status.Phase.IsFinalPhase() || pipe.Status.FinishedAt == nil {
			glog.V(7).Infof("pipeline %s is not finished", pipe.GetObjectMeta().Name)
			continue
		}

		// skip the pipeline which is not finished between the time range
		finishedAt := pipe.Status.FinishedAt.Time
		if finishedAt.Before(startTime) || finishedAt.After(endTime) {
			glog.V(7).Infof("pipeline %s is not in this period", pipe.GetObjectMeta().Name)
			continue
		}

		// skip the pipeline which has no stages info
		if pipe.Status.Jenkins == nil || pipe.Status.Jenkins.Stages == "" {
			glog.V(7).Infof("no stages in jenkins, skip...")
			continue
		}

		wg.Add(1)
		go func(p pipeline.Pipeline) {
			defer wg.Done()

			parseStagesToStagePool(&p, stagePool)
		}(pipe)
	}
	wg.Wait()

	parseStagePoolToResult(stagePool, result)
	return
}

// parseStagesToStagePool parse stages to stage pool
func parseStagesToStagePool(pipe *pipeline.Pipeline, stagePool *sync.Map) {
	jenkinsHistory := JenkinsHistory{}
	if pipe.Status.Jenkins == nil {
		return
	}
	err := json.Unmarshal([]byte(pipe.Status.Jenkins.Stages), &jenkinsHistory)
	if err != nil {
		glog.Errorf("unmarshal jenkinsHistory in pipeline '%s/%s' failed. err: %v",
			pipe.GetObjectMeta().Namespace, pipe.GetObjectMeta().Name, err)
		return
	}

	if jenkinsHistory.Stages == nil || len(jenkinsHistory.Stages) == 0 {
		glog.V(7).Infof("pipeline %s has no stages", pipe.GetObjectMeta().Name)
		return
	}

	//glog.V(5).Infof("parse pipeline: %s; stage's count: %d", pipe.GetObjectMeta().Name, len(jenkinsHistory.Stages))
	for _, stage := range jenkinsHistory.Stages {
		if !stage.IsFinished() {
			glog.V(7).Infof("stage %s in pipeline %s is not finished", stage.Name, pipe.GetObjectMeta().Name)
			continue
		}

		actual, loaded := stagePool.LoadOrStore(stage.Name, &Statistics{})
		if !loaded {
			glog.V(7).Infof("stage %s is stored", stage.Name)
		}
		if actual != nil {
			actualStatistics, _ := actual.(*Statistics)
			actualStatistics.Total++
			if stage.IsSucc() {
				actualStatistics.Succ++
			} else {
				actualStatistics.Failed++
			}
		}
	}
}

// parseStagePoolToResult parse stage pool to result
func parseStagePoolToResult(stagePool *sync.Map, result *StageStatistics) {
	stagePool.Range(func(key, value interface{}) bool {
		k, ok := key.(string)
		if !ok {
			return false
		}

		v, ok := value.(*Statistics)
		if !ok {
			return false
		}

		result.Data = append(result.Data, StageStatisticsData{
			Name:       k,
			Statistics: *v,
		})
		return true
	})

	sort.SliceStable(result.Data, func(i, j int) bool {
		return result.Data[i].Total > result.Data[j].Total
	})

	if len(result.Data) > 8 {
		result.Data = result.Data[0:8]
	}
}

func GetCodeQualityStatistics(devopsClient devopsclient.Interface, namespace *common.NamespaceQuery, dsQuery *dataselect.DataSelectQuery) (result CodeQualityStatistics, err error) {
	glog.V(5).Infof("get codequality statistics")

	codeQualityProjectList, err := codequalityproject.GetCodeQualityProjectList(devopsClient, namespace, dsQuery)
	if err != nil {
		glog.Errorf("error happen when get code quality projects, err: %v", err)
		return
	}

	projects := codeQualityProjectList.Items
	projectNumber := len(projects)
	if projectNumber <= 10 {
		result, err = parseProjectsToCodeQualityStatistics(projects)
		if err != nil {
			glog.Errorf("error happen when convert code quality projects to statistics, err: %v", err)
		}
		return
	}

	var results []*CodeQualityStatistics
	var wg sync.WaitGroup

	queue := make(chan *CodeQualityStatistics, 1)

	workerNumber := (projectNumber-1)/10 + 1
	wg.Add(workerNumber)
	for i := 0; i < workerNumber; i++ {
		ceil := min((i+1)*10, projectNumber)
		go func(floor, ceil int) {
			statistics, err := parseProjectsToCodeQualityStatistics(projects[floor:ceil])
			if err != nil {
				glog.Errorf("error happen when convert code quality projects to statistics, err: %v", err)
				queue <- nil
				return
			}
			queue <- &statistics
		}(i*10, ceil)
	}

	go func() {
		for r := range queue {
			results = append(results, r)
			wg.Done()
		}
	}()

	wg.Wait()

	result, err = mergeCodeQualityStatistics(results)
	if err != nil {
		glog.Errorf("error happen when merge code quality statistics results, err: %v", err)
	}
	return
}

func parseProjectsToCodeQualityStatistics(projects []codequalityproject.CodeQualityProject) (result CodeQualityStatistics, err error) {
	result.MetricSummary = make(map[string]CodeQualityMetricStatistics)

	for _, p := range projects {
		if len(p.Status.CodeQualityConditions) == 0 {
			continue
		}

		for _, c := range p.Status.CodeQualityConditions {
			if !c.IsMain {
				continue
			}

			switch c.Status {
			case "OK":
				result.OK += 1
			case "ERROR":
				result.Error += 1
			case "WARN":
				result.Warn += 1
			}

			for name, metric := range c.Metrics {
				if metric.Level == "" {
					continue
				}

				metricSummary := result.MetricSummary
				metricStatistics, ok := metricSummary[name]
				if !ok {
					metricStatistics = CodeQualityMetricStatistics{}
					metricStatistics.Levels = make(map[string]int)
					metricSummary[name] = metricStatistics
				}

				if _, ok := metricStatistics.Levels[metric.Level]; !ok {
					metricStatistics.Levels[metric.Level] = 0
				}
				metricStatistics.Levels[metric.Level] += 1
			}

		}
	}

	return
}

func mergeCodeQualityStatistics(statistics []*CodeQualityStatistics) (result CodeQualityStatistics, err error) {
	if len(statistics) == 0 {
		return
	}

	result = *statistics[0]
	for _, s := range statistics[1:] {
		result.OK += s.OK
		result.Warn += s.Warn
		result.Error += s.Error
		mergeCodeQualityMetricStatistics(&result, s)
	}
	return
}

func mergeCodeQualityMetricStatistics(current, target *CodeQualityStatistics) (result CodeQualityStatistics) {
	for targetName, targetMetric := range target.MetricSummary {
		currentMetric, ok := current.MetricSummary[targetName]
		if !ok {
			current.MetricSummary[targetName] = targetMetric
			continue
		}
		for targetLevel, targetLevelCount := range targetMetric.Levels {
			_, ok := currentMetric.Levels[targetLevel]
			if !ok {
				currentMetric.Levels[targetLevel] = targetLevelCount
				continue
			}
			currentMetric.Levels[targetLevel] += targetLevelCount
		}
	}
	return *current
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
