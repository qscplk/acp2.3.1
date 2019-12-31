package handler

import (
	"fmt"
	"os"
	"time"
)

func GetRecentPeriodTime(period string) (startTime, endTime time.Time, err error) {
	endTime = time.Now()
	startTime = endTime
	dur, err := time.ParseDuration(period)
	if err != nil {
		err = fmt.Errorf("please provide an available parameter 'period'")
		return
	}

	startTime = endTime.Add(dur)
	return
}

func GetAppKey(key string) string {
	domain := os.Getenv("LABEL_BASE_DOMAIN")
	if domain == "" {
		domain = "alauda.io"
	}
	return fmt.Sprintf("app.%s/display-name", domain)
}
