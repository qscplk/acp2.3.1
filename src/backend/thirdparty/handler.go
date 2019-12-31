package thirdparty

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	clientapi "alauda.io/diablo/src/backend/client/api"
	kdErrors "alauda.io/diablo/src/backend/errors"
	settingsapi "alauda.io/diablo/src/backend/settings/api"
	thirdpartyapi "alauda.io/diablo/src/backend/thirdparty/api"
	restful "github.com/emicklei/go-restful"
)

// ThirdPartyHandler third party integration handler
// current implementation should be refactored in the future
type ThirdPartyHandler struct {
	settingsManager settingsapi.SettingsManager
	clientManager   clientapi.ClientManager
	manager         thirdpartyapi.ThirdPartyManager
}

func (han *ThirdPartyHandler) Install(ws *restful.WebService) {
	ws.Route(
		ws.GET("/thirdparty").
			To(han.handleThirdParty).
			Writes([]*thirdpartyapi.Integration{}))

	ws.Route(
		ws.GET("/thirdparty/{name}").
			To(han.handleThirdPartyOther))

	ws.Route(
		ws.GET("/portallinks").
			To(han.handlePortalLinks))
}

func (han *ThirdPartyHandler) handleThirdParty(request *restful.Request, response *restful.Response) {
	client := han.clientManager.InsecureClient()

	integrations := han.manager.GetIntegration(client, han.settingsManager)
	response.WriteHeaderAndEntity(http.StatusOK, integrations)
}

func (han *ThirdPartyHandler) handleThirdPartyOther(request *restful.Request, response *restful.Response) {
	client, err := han.clientManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	auth, err := han.extractAuthInfo(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	} else if auth == nil {
		kdErrors.HandleInternalError(response, fmt.Errorf("Not authorized"))
		return
	}
	name := request.PathParameter("name")
	log.Println("Will request", name, "with token", *auth)
	data, err := han.manager.GetData(name, *auth, client, han.settingsManager)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}
	response.WriteHeaderAndEntity(http.StatusOK, data)
}

func (han *ThirdPartyHandler) handlePortalLinks(request *restful.Request, response *restful.Response) {
	client, err := han.clientManager.Client(request)
	if err != nil {
		kdErrors.HandleInternalError(response, err)
		return
	}

	data := []*thirdpartyapi.PortalGroup{}
	devopsSettings := han.settingsManager.GetDevopsSettings(client)
	plink, err := convertToPortalLink(devopsSettings)
	if err != nil {
		log.Println("error parsing devopsSettings PortalLinks: err ", err, " original value ", devopsSettings.PortalLinks)
		response.WriteHeaderAndEntity(http.StatusOK, data)
		return
	}

	if plink != nil && plink.Enabled {
		data = plink.Groups
	} else {
		log.Println("Portlinks is disabled or missing.")
	}

	response.WriteHeaderAndEntity(http.StatusOK, data)
}

func (han *ThirdPartyHandler) extractAuthInfo(req *restful.Request) (*thirdpartyapi.AuthInfo, error) {
	if req == nil {
		log.Print("No request provided. Skipping authorization")
		return nil, nil
	}
	// Authorization header will be more important than our token
	authHeader := req.HeaderParameter("Authorization")
	// Token stores access_token
	accessToken := req.HeaderParameter("Token")
	token := han.extractTokenFromHeader(authHeader)

	if len(token) > 0 || len(accessToken) > 0 {
		return &thirdpartyapi.AuthInfo{IDToken: token, AccessToken: accessToken}, nil
	}
	return nil, nil
}

func (han *ThirdPartyHandler) extractTokenFromHeader(authHeader string) string {
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	return ""
}

func NewThirdPartyHandler(
	settingsManager settingsapi.SettingsManager,
	clientManager clientapi.ClientManager,
	manager thirdpartyapi.ThirdPartyManager,
) *ThirdPartyHandler {
	return &ThirdPartyHandler{
		settingsManager: settingsManager,
		clientManager:   clientManager,
		manager:         manager,
	}
}
