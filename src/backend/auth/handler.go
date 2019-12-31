// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package auth

import (
	er "errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	authApi "alauda.io/diablo/src/backend/auth/api"
	"alauda.io/diablo/src/backend/errors"
	"github.com/coreos/go-oidc"
	restful "github.com/emicklei/go-restful"
)

// AuthHandler manages all endpoints related to dashboard auth, such as login.
type AuthHandler struct {
	manager  authApi.AuthManager
	AppState string
}

// Install creates new endpoints for dashboard auth, such as login. It allows user to log in to dashboard using
// one of the supported methods. See AuthManager and Authenticator for more information.
func (self AuthHandler) Install(ws *restful.WebService) {
	ws.Route(
		ws.GET("/login").
			To(self.handleLogin).
			Writes(authApi.LoginResponse{}))

	ws.Route(
		ws.POST("/login/callback").
			To(self.handleCallback).
			Writes(authApi.AuthResponse{}))

	ws.Route(
		ws.GET("/login/callback").
			To(self.handleCallback).
			Writes(authApi.AuthResponse{}))

	//ws.Route(
	//	ws.GET("/login/status").
	//		To(self.handleLoginStatus).
	//		Writes(validation.LoginStatus{}))
	//ws.Route(
	//	ws.POST("/token/refresh").
	//		Reads(authApi.TokenRefreshSpec{}).
	//		To(self.handleJWETokenRefresh).
	//		Writes(authApi.AuthResponse{}))
	//ws.Route(
	//	ws.GET("/login/modes").
	//		To(self.handleLoginModes).
	//		Writes(authApi.LoginModesResponse{}))
}

func (self *AuthHandler) handleLogin(request *restful.Request, response *restful.Response) {
	log.Println("---------", "handleLogin")
	loginResponse := authApi.LoginResponse{Errors: []error{}}
	settings := self.manager.GetAuthSettings(nil)
	if settings != nil {
		loginResponse.Settings = *settings
		if settings.Enabled {
			oauth2Config, options, err := self.manager.GetOAuth2Config(nil)
			if err != nil {
				log.Println("Error checking oauth2Config:", err)
				loginResponse.Errors = append(loginResponse.Errors, errors.FormatError(err))
			}
			if oauth2Config != nil {
				authCodeURL := oauth2Config.AuthCodeURL(self.AppState, options...)
				loginResponse.AuthURL = authCodeURL
				log.Println("Issuer Inner: ", settings.IssuerInner)
				log.Println("Issuer Public: ", settings.Issuer)
				log.Println("AuthURL before converting: ", loginResponse.AuthURL)
				if settings.IssuerInner != "" {
					loginResponse.AuthURL = strings.Replace(loginResponse.AuthURL, settings.IssuerInner, settings.Issuer, 1)
				}
				log.Println("AuthURL after converting: ", loginResponse.AuthURL)
			}
		}
	}

	response.WriteHeaderAndEntity(http.StatusOK, loginResponse)
}

// func (self *AuthHandler) handleSyncUserInfo(request *restful.Request, response *restful.Response) {
// 	log.Println("---------", "handleSyncUserInfo")
// 	var (
// 		id_token         string
// 		token_is_invalid bool
// 	)

// 	authHeader := request.HeaderParameter("Authorization")
// 	if strings.HasPrefix(authHeader, "Bearer ") {
// 		id_token = strings.TrimPrefix(authHeader, "Bearer ")
// 	}

// 	am := self.manager.(*manager)
// 	err := am.clientManager.HasAccess(api.AuthInfo{Token: id_token})
// 	if err != nil {
// 		log.Printf("sync user info error: %v", err)
// 		token_is_invalid = true
// 	}

// 	jweToken, err := authApi.ParseJWT(id_token)
// 	if err != nil {
// 		log.Printf("sync user info error: %v", err)
// 		token_is_invalid = true
// 	}
// 	log.Printf("login success: %s", id_token)

// 	if !token_is_invalid {
// 		if err := self.manager.SyncUserInfo(nil, jweToken); err != nil {
// 			errors.HandleInternalError(response, err)
// 			return
// 		}
// 	}
// 	response.WriteHeaderAndEntity(http.StatusOK, !token_is_invalid)
// }

func (self *AuthHandler) handleCallback(request *restful.Request, response *restful.Response) {
	var (
		authResponse *authApi.AuthResponse
		err          error
	)

	authSettings := self.manager.GetAuthSettings(nil)
	ctx := oidc.ClientContext(request.Request.Context(), self.manager.GetHTTPClient(nil))

	switch request.Request.Method {
	case http.MethodGet:
		// there are two cases to be considered:
		// 1. reponse_type code: needs to use authorization code to request the API one more time and fetch ID_TOKEN etc.
		// 2. response_type id_token: already returns the id_token and access_token
		switch authSettings.ResponseType {
		case "id_token":
			idToken := request.QueryParameter("id_token")
			// For some reason dex also returns the query parameters behind a shebang instead of
			// regular query parameters, se we will check this here
			if idToken == "" {
				url := request.Request.URL
				log.Println("id_token callback. raw url:", url.String())
				log.Println("id_token, raw query:", url.RawQuery)
				log.Println("id_token, raw path:", url.RawPath)
			}
			if idToken != "" {
				authResponse = &authApi.AuthResponse{
					IDToken: idToken,
				}
			}
		case "code":
			fallthrough
		default:
			if errMsg := request.QueryParameter("error"); errMsg != "" {
				errors.HandleInternalError(response, er.New("errMsg"+request.QueryParameter("error_description")))
				return
			}
			code := request.QueryParameter("code")
			if code == "" {
				errors.HandleInternalError(response, er.New(fmt.Sprintf("no code in request")))
				return
			}

			if state := request.QueryParameter("state"); state != self.AppState {
				errors.HandleInternalError(response, er.New(fmt.Sprintf("expected state %q got %q", self.AppState, state)))
			}
			authResponse, err = self.manager.RetrieveToken(code, ctx)
			if err != nil {
				errors.HandleInternalError(response, err)
				return
			}
		}

	case http.MethodPost:
		refreshToken := request.QueryParameter("refresh_token")
		authResponse, err = self.manager.Refresh(refreshToken, ctx)
		if err != nil {
			errors.HandleInternalError(response, err)
			return
		}
	default:
		errors.HandleInternalError(response, er.New(fmt.Sprintf("method not implemented: %s", request.Request.Method)))
		return
	}
	if authResponse == nil {
		errors.HandleInternalError(response, er.New(fmt.Sprintf("Request failed to parse callback data: %s", request.Request.URL)))
		return
	}
	jweToken, err := authApi.ParseJWT(authResponse.IDToken)
	if err != nil {
		errors.HandleInternalError(response, err)
		return
	}
	log.Println("IDTOKEN:", authResponse.IDToken)
	log.Println("access token:", authResponse.AccessToken)
	authResponse.Email = jweToken.Email
	authResponse.Name = jweToken.Name
	authResponse.Groups = jweToken.Groups
	authResponse.IsAdmin = jweToken.Ext.IsAdmin
	log.Println("AuthResponse:", authResponse)
	if err := self.manager.SyncUserInfo(request, jweToken); err != nil {
		errors.HandleInternalError(response, err)
		return
	}

	response.WriteHeaderAndEntity(http.StatusOK, authResponse)
}

// NewAuthHandler created AuthHandler instance.
func NewAuthHandler(manager authApi.AuthManager) AuthHandler {
	return AuthHandler{manager: manager}
}

/* -------------- OLD AUTH ------------ */
// func (self AuthHandler) handleLogin(request *restful.Request, response *restful.Response) {
// 	loginSpec := new(authApi.LoginSpec)
// 	if err := request.ReadEntity(loginSpec); err != nil {
// 		response.AddHeader("Content-Type", "text/plain")
// 		response.WriteErrorString(http.StatusInternalServerError, err.Error()+"\n")
// 		return
// 	}

// 	loginResponse, err := self.manager.Login(loginSpec)
// 	if err != nil {
// 		response.AddHeader("Content-Type", "text/plain")
// 		response.WriteErrorString(http.StatusInternalServerError, err.Error()+"\n")
// 		return
// 	}

// 	response.WriteHeaderAndEntity(http.StatusOK, loginResponse)
// }

// func (self *AuthHandler) handleLoginStatus(request *restful.Request, response *restful.Response) {
// 	response.WriteHeaderAndEntity(http.StatusOK, validation.ValidateLoginStatus(request))
// }

// func (self *AuthHandler) handleJWETokenRefresh(request *restful.Request, response *restful.Response) {
// 	tokenRefreshSpec := new(authApi.TokenRefreshSpec)
// 	if err := request.ReadEntity(tokenRefreshSpec); err != nil {
// 		response.AddHeader("Content-Type", "text/plain")
// 		response.WriteErrorString(http.StatusInternalServerError, err.Error()+"\n")
// 		return
// 	}

// 	refreshedJWEToken, err := self.manager.Refresh(tokenRefreshSpec.JWEToken)
// 	if err != nil {
// 		response.AddHeader("Content-Type", "text/plain")
// 		response.WriteErrorString(http.StatusInternalServerError, err.Error()+"\n")
// 		return
// 	}

// 	response.WriteHeaderAndEntity(http.StatusOK, &authApi.AuthResponse{
// 		JWEToken: refreshedJWEToken,
// 		Errors:   make([]error, 0),
// 	})
// }

// func (self *AuthHandler) handleLoginModes(request *restful.Request, response *restful.Response) {
// 	response.WriteHeaderAndEntity(http.StatusOK, authApi.LoginModesResponse{Modes: self.manager.AuthenticationModes()})
// }
