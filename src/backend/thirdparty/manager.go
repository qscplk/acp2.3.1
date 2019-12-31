package thirdparty

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	settingsapi "alauda.io/diablo/src/backend/settings/api"
	thirdpartyapi "alauda.io/diablo/src/backend/thirdparty/api"
	"k8s.io/client-go/kubernetes"
)

type ThirdPartyManager struct {
}

func NewThirdPartyManager() thirdpartyapi.ThirdPartyManager {
	return &ThirdPartyManager{}
}

func (m *ThirdPartyManager) GetIntegration(client kubernetes.Interface, settingsMngr settingsapi.SettingsManager) []*thirdpartyapi.Integration {
	devopsSettings := settingsMngr.GetDevopsSettings(client)
	integ, err := convertToIntegrations(devopsSettings)
	if err != nil {
		log.Println("error parsing devopsSettings integration: err ", err, " original value ", devopsSettings.Integrations)
		integ = []*thirdpartyapi.Integration{}
	}
	return integ
	// // TODO: Change to fetch from configuration
	// return []*thirdpartyapi.Integration{
	// 	&thirdpartyapi.Integration{
	// 		Enabled: true,
	// 		Type:    thirdpartyapi.TPMayun,
	// 		Mayun: &thirdpartyapi.IntegrationMayun{

	// 			Host: "http://www.sparrow.li",
	// 		},
	// 	},
	// 	&thirdpartyapi.Integration{
	// 		Enabled: true,
	// 		Type:    thirdpartyapi.TPZentao,
	// 		Zentao: &thirdpartyapi.IntegrationZentao{
	// 			Host: "http://159.65.147.215:30081",
	// 		},
	// 	},
	// }
}

func convertToIntegrations(sett *settingsapi.DevopsSettings) (integ []*thirdpartyapi.Integration, err error) {
	var data []byte
	data, err = json.Marshal(sett.Integrations)
	if err != nil {
		log.Println("Error converting integrations:", sett.Integrations)
		return
	}
	err = json.Unmarshal(data, &integ)
	return
}

func convertToPortalLink(sett *settingsapi.DevopsSettings) (plink *thirdpartyapi.PortalLinks, err error) {
	var data []byte
	log.Println("devops-config:", sett)
	data, err = json.Marshal(sett.PortalLinks)
	if err != nil {
		log.Println("Error converting portal_links:", sett.PortalLinks)
		return
	}
	err = json.Unmarshal(data, &plink)
	return
}

func (m *ThirdPartyManager) GetData(name string, token thirdpartyapi.AuthInfo, client kubernetes.Interface, settingsMngr settingsapi.SettingsManager) (res interface{}, err error) {
	integrations := m.GetIntegration(client, settingsMngr)
	var targetInt *thirdpartyapi.Integration
	if len(integrations) > 0 {
		for _, i := range integrations {
			if i.Type == name {
				targetInt = i
				break
			}
		}
	}
	if targetInt == nil {
		err = fmt.Errorf("Integration not available: %s", name)
		return
	}
	res, err = m.makeRequest(name, token, targetInt)
	return
}

func (m *ThirdPartyManager) getClient() (client *http.Client) {
	client = http.DefaultClient
	client.Timeout = time.Second * 30
	return
}

func (m *ThirdPartyManager) makeRequest(name string, token thirdpartyapi.AuthInfo, integration *thirdpartyapi.Integration) (data interface{}, err error) {
	req := integration.GetRequest(token)
	client := m.getClient()
	var resp *http.Response
	if resp, err = client.Do(req); err != nil {
		return
	}
	body, _ := ioutil.ReadAll(resp.Body)
	if !isGoodResponse(resp) {
		err = fmt.Errorf(
			"Server returned unexpected result: status %s %d content: %s",
			resp.Status, resp.StatusCode, body,
		)
	}
	data = new(interface{})
	err = json.Unmarshal(body, &data)
	return
}

func isGoodResponse(resp *http.Response) bool {
	if resp == nil {
		return false
	}
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

// func (m *ThirdPartyManager) InstallAPI(ws *restful.WebService) {
//   // TODO: Refactor to a better form of doing this
//   ws.Route(
// 		ws.GET("/thirdparty/mayun").
// 			To(han.handleThirdParty).
// 			Writes([]*thirdpartyapi.Integration{}))
// }

// func (m *Third)
