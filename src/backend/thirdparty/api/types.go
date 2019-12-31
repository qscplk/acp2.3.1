package api

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	settingsapi "alauda.io/diablo/src/backend/settings/api"
	"k8s.io/client-go/kubernetes"
)

const (
	TPMayun        = "mayun"
	TPMayunProject = "mayun_project"
	TPZentao       = "zentao"
)

// ThirdPartyManager manager interface for integration
type ThirdPartyManager interface {
	GetIntegration(kubernetes.Interface, settingsapi.SettingsManager) []*Integration
	GetData(name string, token AuthInfo, client kubernetes.Interface, settingsMnger settingsapi.SettingsManager) (interface{}, error)
	// InstallAPI(ws *restful.WebService)
}

type AuthInfo struct {
	IDToken     string
	AccessToken string
}

// type Integrator interface {
//   GetRequest(token string)
// }

// Integration integration type
type Integration struct {
	Enabled      bool                     `json:"enabled"`
	Type         string                   `json:"type"`
	Mayun        *IntegrationMayun        `json:"mayun,omitempty"`
	MayunProject *IntegrationMayunProject `json:"mayun_project,omitempty"`
	Zentao       *IntegrationZentao       `json:"zentao,omitempty"`
}

// IntegrationMayun integration mayun
type IntegrationMayun struct {
	Host string `json:"host"`
}

// IntegrationMayun project
type IntegrationMayunProject struct {
	Host        string `json:"host"`
	RedirectUrl string `json:"redirect_url"`
}

// IntegrationZentao zentao integration
type IntegrationZentao struct {
	Host string `json:"host"`
}

type PortalLinks struct {
	Enabled bool           `json:"enabled"`
	Groups  []*PortalGroup `json:"groups,omitempty"`
}

type PortalGroup struct {
	Key    string        `json:"key"`
	EnName string        `json:"enName"`
	ZhName string        `json:"zhName"`
	Links  []*PortalLink `json:"links"`
}

type PortalLink struct {
	Link string `json:"link"`
	Icon string `json:"icon"`
}

func (in *Integration) GetRequest(token AuthInfo) (req *http.Request) {
	if in == nil {
		return nil
	}

	var host string
	var requestUrl string

	switch in.Type {
	case TPMayun:
		host = strings.TrimSuffix(in.Mayun.Host, "/")
		log.Println("will do the followingrequest: ", fmt.Sprintf("%s/api/v5/user/repos?access_token=%s", host, token.AccessToken))
		req, _ = http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/v5/user/repos?access_token=%s", host, token.AccessToken), nil)
	case TPZentao:
	case TPMayunProject:
		host = strings.TrimSuffix(in.MayunProject.Host, "/")

		requestUrl = fmt.Sprintf("%s/api/v5/issues?access_token=%s&filter=all&state=open&sort=created&direction=desc&page=1&per_page=20", host, token.AccessToken)

		log.Println("will do the fllowing request: ", requestUrl)
		req, _ = http.NewRequest(http.MethodGet, requestUrl, nil)
	}
	return
}
