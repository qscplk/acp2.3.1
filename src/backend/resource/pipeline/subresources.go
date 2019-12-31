package pipeline

import (
	"log"

	devopsv1alpha1 "alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"
)

// LogDetails log details
type LogDetails struct {
	*devopsv1alpha1.PipelineLog
}

// GetLogDetails returns logs for particular pod and container. When container is null, logs for the first one
// are returned. Previous indicates to read archived logs created by log rotation or container crash
func GetLogDetails(client devopsclient.Interface, namespace, name string, start, stage, step int) (*LogDetails, error) {

	logOpts := &devopsv1alpha1.PipelineLogOptions{
		Start: int64(start),
		Stage: int64(stage),
		Step:  int64(step),
	}
	log.Println("will fetch log with params: start", start, "stage", stage, "step", step)

	pipelineLog, err := client.DevopsV1alpha1().Pipelines(namespace).GetLogs(name, logOpts)
	if err != nil {
		log.Println("Error fetching logs: ", err)
		return nil, err
	}
	return &LogDetails{
		PipelineLog: pipelineLog,
	}, nil
}

// TaskDetails jenkins step details
type TaskDetails struct {
	*devopsv1alpha1.PipelineTask
}

// GetTaskDetails returns logs for particular pod and container. When container is null, logs for the first one
// are returned. Previous indicates to read archived logs created by log rotation or container crash
func GetTaskDetails(client devopsclient.Interface, namespace, name string, stage int) (*TaskDetails, error) {

	taskOpts := &devopsv1alpha1.PipelineTaskOptions{Stage: int64(stage)}
	log.Println("will fetch tasks with params: ", taskOpts)

	pipelineTasks, err := client.DevopsV1alpha1().Pipelines(namespace).GetTasks(name, taskOpts)
	if err != nil {
		log.Println("Error fetching logs: ", err)
		return nil, err
	}
	return &TaskDetails{
		PipelineTask: pipelineTasks,
	}, nil
}
