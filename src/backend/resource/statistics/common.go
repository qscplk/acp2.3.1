package statistics

const (
	StatusFinished = "FINISHED"
	StatusSkipped  = "SKIPPED"

	ResultSuccessed = "SUCCESS"
	ResultFailure   = "FAILURE"
	ResultNotBuilt  = "NOT_BUILT"
)

type JenkinsHistory struct {
	StartStageID string         `json:"start_stage_id"`
	Stages       []JenkinsStage `json:"stages"`
}

type JenkinsStage struct {
	ID                  string             `json:"id"`
	Name                string             `json:"name"`
	Status              string             `json:"status"`
	Result              string             `json:"result"`
	StartTime           string             `json:"start_time"`
	DurationMillis      int64              `json:"duration_millis"`
	PauseDurationMillis int64              `json:"pause_duration_millis"`
	Edges               []JenkinsStageEdge `json:"edges"`
}

func (s JenkinsStage) IsFinished() bool {
	return s.Status == StatusFinished
}

func (s JenkinsStage) IsSucc() bool {
	return s.Result == ResultSuccessed
}

type JenkinsStageEdge struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}
