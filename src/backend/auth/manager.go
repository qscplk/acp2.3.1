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
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	authApi "alauda.io/diablo/src/backend/auth/api"
	clientapi "alauda.io/diablo/src/backend/client/api"
	settingsapi "alauda.io/diablo/src/backend/settings/api"
	"github.com/coreos/go-oidc"
	"github.com/emicklei/go-restful"
	"golang.org/x/oauth2"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd/api"
	// kdErrors "alauda.io/diablo/src/backend/errors"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type AuthConfig struct {
	ClientID string
	// ClientSecret string
	// RedirectURI  string
	// IssuerURL    string
	// Namespace    string

	Verifier *oidc.IDTokenVerifier
	Provider *oidc.Provider
}

// Implements AuthManager interface
type authManager struct {
	tokenManager        authApi.TokenManager
	clientManager       clientapi.ClientManager
	settingsManager     settingsapi.SettingsManager
	authenticationModes authApi.AuthenticationModes
	HttpClient          *http.Client
	CAPath              string
	CACert              string
	AuthConfig
}

// Login implements auth manager. See AuthManager interface for more information.
// func (am authManager) Login(spec *authApi.LoginSpec) (*authApi.AuthResponse, error) {
// 	authenticator, err := am.getAuthenticator(spec)
// 	if err != nil {
// 		return nil, err
// 	}

// 	authInfo, err := authenticator.GetAuthInfo()
// 	if err != nil {
// 		return nil, err
// 	}

// 	err = am.healthCheck(authInfo)
// 	nonCriticalErrors, criticalError := kdErrors.HandleError(err)
// 	if criticalError != nil || len(nonCriticalErrors) > 0 {
// 		return &authApi.AuthResponse{Errors: nonCriticalErrors}, criticalError
// 	}

// 	token, err := am.tokenManager.Generate(authInfo)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return &authApi.AuthResponse{JWEToken: token, Errors: nonCriticalErrors}, nil
// }

// Refresh implements auth manager. See AuthManager interface for more information.
// func (am authManager) Refresh(jweToken string) (string, error) {
// 	return am.tokenManager.Refresh(jweToken)
// }

func (am authManager) AuthenticationModes() []authApi.AuthenticationMode {
	return am.authenticationModes.Array()
}

// Returns authenticator based on provided LoginSpec.
func (am authManager) getAuthenticator(spec *authApi.LoginSpec) (authApi.Authenticator, error) {
	if len(am.authenticationModes) == 0 {
		return nil, errors.New("All authentication options disabled. Check --authentication-modes argument for more information.")
	}

	switch {
	case len(spec.Token) > 0 && am.authenticationModes.IsEnabled(authApi.Token):
		return NewTokenAuthenticator(spec), nil
	case len(spec.Username) > 0 && len(spec.Password) > 0 && am.authenticationModes.IsEnabled(authApi.Basic):
		return NewBasicAuthenticator(spec), nil
	case len(spec.KubeConfig) > 0:
		return NewKubeConfigAuthenticator(spec, am.authenticationModes), nil
	}

	return nil, errors.New("Not enough data to create authenticator.")
}

func (am *authManager) getClient() (kubernetes.Interface, error) {
	return am.clientManager.InsecureClient(), nil
}

func (am *authManager) isAuthEnabled(client kubernetes.Interface) (enabled bool, err error) {
	if client == nil {
		if client, err = am.getClient(); err != nil {
			return
		}
	}
	settings := am.settingsManager.GetAuthSettings(client)
	if settings != nil {
		enabled = settings.Enabled
	}
	return
}

func (am *authManager) RetrieveToken(authCode string, ctx context.Context) (*authApi.AuthResponse, error) {
	var (
		err   error
		token *oauth2.Token
	)
	oauth2Config, _, err := am.GetOAuth2Config(nil)
	if err != nil {
		return nil, err
	}

	token, err = oauth2Config.Exchange(ctx, authCode)
	if err != nil {
		return nil, err
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("no id_token in token response")
	}

	_, err = am.Verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, errors.New(fmt.Sprintf("Failed to verify ID token: %v", err))
	}

	authResponse := authApi.AuthResponse{
		IDToken:      rawIDToken,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
	}
	return &authResponse, nil
}

func (am *authManager) Refresh(refreshToken string, ctx context.Context) (*authApi.AuthResponse, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return nil, errors.New("no refresh_token in request")
	}

	t := &oauth2.Token{
		RefreshToken: refreshToken,
		Expiry:       time.Now().Add(-time.Hour),
	}
	oauth2Config, _, err := am.GetOAuth2Config(nil)
	if err != nil {
		return nil, err
	}

	token, err := oauth2Config.TokenSource(ctx, t).Token()
	if err != nil {
		return nil, err
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("no id_token in token response")
	}

	_, err = am.Verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, errors.New(fmt.Sprintf("Failed to verify ID token: %v", err))
	}

	authResponse := authApi.AuthResponse{
		IDToken:      rawIDToken,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
	}
	return &authResponse, nil
}

func (am authManager) ClearUserInfo(request *restful.Request, connectors []interface{}) error {
	log.Printf("clearUserInfo connectors: %v", connectors)

	// k8sClient, err := am.clientManager.Client(request)
	// if err != nil {
	// 	return err
	// }

	// userResource, err := authApi.GetApiResource(authApi.CrdUserKind, false, k8sClient)
	// if err != nil {
	// 	return err
	// }

	// dynamicClient, err := am.clientManager.DynamicClient(request,
	// 	&schema.GroupVersion{authApi.CrdUserGroup, authApi.CrdUserVersion})
	// if err != nil {
	// 	return err
	// }

	// for _, connector := range connectors {
	// 	idpID := connector.(map[interface{}]interface{})["id"].(string)
	// 	labelSelector := fmt.Sprintf("type=%s", idpID)
	// 	go dynamicClient.Resource(userResource, "").DeleteCollection(&metav1.DeleteOptions{}, metav1.ListOptions{LabelSelector: labelSelector})
	// }

	return nil
}

func (am authManager) SyncUserInfo(request *restful.Request, jweToken *authApi.JWEToken) error {
	// log.Printf("SyncUserInfo: %v", jweToken)

	// k8sClient, err := am.clientManager.Client(request)
	// if err != nil {
	// 	return err
	// }

	// userResource, err := authApi.GetApiResource(authApi.CrdUserKind, false, k8sClient)
	// if err != nil {
	// 	return err
	// }

	// payload := getUserPayload(jweToken)
	// log.Printf("SyncUserInfo payload: %v", payload)

	// dynamicClient, err := am.clientManager.DynamicClient(request,
	// 	&schema.GroupVersion{authApi.CrdUserGroup, authApi.CrdUserVersion})
	// if err != nil {
	// 	return err
	// }

	// userInfo, err := dynamicClient.Resource(userResource, "").Get(jweToken.MetadataName, metav1.GetOptions{})
	// if err != nil {
	// 	_, err = dynamicClient.Resource(userResource, "").Create(payload)
	// } else {
	// 	userInfo.Object["spec"] = payload.Object["spec"]
	// 	_, err = dynamicClient.Resource(userResource, "").Update(userInfo)
	// }

	// return err
	return nil
}

var defaultOScopes = []string{"openid", "profile", "email", "ext", "groups"}

func (am authManager) GetScopes(settings *settingsapi.AuthSettings) []string {
	log.Println("authSettings", *settings)
	customScopes := []string{}
	if settings != nil && settings.Enabled && len(settings.Scopes) > 0 {
		customScopes = append(customScopes, settings.Scopes...)
	}
	return customScopes
}

func (am *authManager) Oauth2Config(scopes []string, client kubernetes.Interface, authSettings *settingsapi.AuthSettings) (*oauth2.Config, []oauth2.AuthCodeOption, error) {
	var err error
	provider := am.Provider

	issuerInner := authSettings.IssuerInner
	issuerPubic := authSettings.Issuer

	if am.ClientID != authSettings.ClientID {
		httpClient := am.GetHTTPClient(client)
		log.Println("http client", httpClient)
		ctx := oidc.ClientContext(context.Background(), httpClient)

		issuer := issuerInner
		if issuer == "" {
			issuer = issuerPubic
		}

		provider, err = oidc.NewProvider(ctx, issuer)
		if err != nil {
			return nil, nil, fmt.Errorf("Failed to query provider %q: %v", issuer, err)
		}
		am.ClientID = authSettings.ClientID
		am.Verifier = provider.Verifier(&oidc.Config{ClientID: authSettings.ClientID})
		am.Provider = provider
	}
	redirectURL := authSettings.RedirectURI
	options := []oauth2.AuthCodeOption{
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("response_type", authSettings.ResponseType),
		oauth2.SetAuthURLParam("nonce", "rng"),
	}
	if len(authSettings.CustomRedirectURI) > 0 {
		if url := authSettings.CustomRedirectURI[settingsapi.SettingsCustomRedirectKey]; url != "" {
			redirectURL = url
		}
	}

	return &oauth2.Config{
		ClientID:     authSettings.ClientID,
		ClientSecret: authSettings.ClientSecret,
		Endpoint:     provider.Endpoint(),
		Scopes:       scopes,
		RedirectURL:  redirectURL,
	}, options, nil
}

// GetOAuth2Config returns the used oAuth2 configuration
func (am *authManager) GetOAuth2Config(client kubernetes.Interface) (*oauth2.Config, []oauth2.AuthCodeOption, error) {
	var err error
	client, err = am.getK8sClient(client)
	if err != nil {
		return nil, nil, err
	}
	authSettings := am.settingsManager.GetAuthSettings(client)
	if authSettings == nil {
		return nil, nil, fmt.Errorf("Auth settings not available")
	}
	if !authSettings.Enabled {
		return nil, nil, fmt.Errorf("OIDC Auth is not enabled")
	}
	return am.Oauth2Config(am.GetScopes(authSettings), client, authSettings)
}

// healthCheck Checks if user data extracted from provided AuthInfo structure is valid and user is correctly authenticated
// by K8S apiserver.
func (am authManager) healthCheck(authInfo api.AuthInfo) error {
	return am.clientManager.HasAccess(authInfo)
}

// GetHTTPClient returns a http client
func (am *authManager) GetHTTPClient(client kubernetes.Interface) *http.Client {
	client, _ = am.getK8sClient(client)
	authSettings := am.settingsManager.GetAuthSettings(client)
	if authSettings == nil || !authSettings.Enabled || (authSettings.RootCAFile == "" && authSettings.RootCA == "") {
		am.HttpClient = http.DefaultClient
		am.HttpClient.Timeout = time.Second * 30
	} else if authSettings.RootCAFile != am.CAPath || authSettings.RootCA != am.CACert {
		var err error
		am.HttpClient, err = authApi.GetClient(authSettings.RootCAFile, authSettings.RootCA)
		if err != nil {
			am.HttpClient = http.DefaultClient
			log.Println("Error getting HTTP client:", err)
		} else {
			am.CAPath = authSettings.RootCAFile
			am.CACert = authSettings.RootCA
		}
	}
	return am.HttpClient
}

func (am *authManager) getK8sClient(client kubernetes.Interface) (kubernetes.Interface, error) {
	var err error
	if client == nil {
		client, err = am.getClient()
	}
	return client, err
}

func (am *authManager) GetAuthSettings(client kubernetes.Interface) *settingsapi.AuthSettings {
	client, _ = am.getK8sClient(client)
	return am.settingsManager.GetAuthSettings(client)
}

// NewAuthManager creates auth manager.
func NewAuthManager(
	clientManager clientapi.ClientManager,
	tokenManager authApi.TokenManager,
	settingsManager settingsapi.SettingsManager,
	authenticationModes authApi.AuthenticationModes,
	client *http.Client) authApi.AuthManager {
	return &authManager{
		tokenManager:        tokenManager,
		clientManager:       clientManager,
		settingsManager:     settingsManager,
		authenticationModes: authenticationModes,
		HttpClient:          client,
	}
}

func getUserPayload(jweToken *authApi.JWEToken) *unstructured.Unstructured {
	userInfo := make(map[string]interface{})
	userInfo["apiVersion"] = fmt.Sprintf("%s/%s", authApi.CrdUserGroup, authApi.CrdUserVersion)
	userInfo["kind"] = authApi.CrdUserKind

	metadata := make(map[string]interface{})

	metadata["name"] = jweToken.MetadataName
	userInfo["metadata"] = metadata

	labels := make(map[string]interface{})
	labels["type"] = jweToken.Ext.ConnID
	metadata["labels"] = labels

	spec := make(map[string]interface{})
	spec["email"] = jweToken.Email
	spec["name"] = jweToken.Name
	spec["groups"] = jweToken.Groups
	spec["is_admin"] = jweToken.Ext.IsAdmin
	userInfo["spec"] = spec

	return &unstructured.Unstructured{
		Object: userInfo,
	}
}
