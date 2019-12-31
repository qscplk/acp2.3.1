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

package api

import (
	"crypto/md5"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/emicklei/go-restful"
)

const (
	CrdResourceGroup   = "apiextensions.k8s.io"
	CrdResourceVersion = "v1beta1"
	CrdResourceKind    = "CustomResourceDefinition"

	CrdUserKind    = "AlaudaUser"
	CrdUserGroup   = "auth.io"
	CrdUserVersion = "v1"
	CrdUserName    = "alaudausers.auth.io"

	CrdAlaudaK8sKind    = "AlaudaK8s"
	CrdAlaudaK8sGroup   = "auth.io"
	CrdAlaudaK8sVersion = "v1"
	CrdAlaudaK8sName    = "alaudak8s.auth.io"

	CrdAlaudaDevopsKind    = "AlaudaDevops"
	CrdAlaudaDevopsGroup   = "auth.io"
	CrdAlaudaDevopsVersion = "v1"
	CrdAlaudaDevopsName    = "alaudadevops.auth.io"

	DexConfigMapVersion = "v1"
	DexConfigMapGroup   = ""
	DexConfigMapName    = "dex-configmap"

	DexDeploymentVersion = "v1beta1"
	DexDeploymentGroup   = "extensions"
	DexDeploymentName    = "alauda-dex"

	ConfigMap  = "ConfigMap"
	Deployment = "Deployment"
)

type JWEToken struct {
	Issuer        string      `json:"iss"`
	Subject       string      `json:"sub"`
	Audience      string      `json:"aud"`
	Expiry        int         `json:"exp"`
	IssuedAt      int         `json:"iat"`
	Nonce         string      `json:"nonce"`
	Email         string      `json:"email"`
	EmailVerified bool        `json:"email_verified"`
	Name          string      `json:"name"`
	Groups        []string    `json:"groups"`
	Ext           jwtTokenExt `json:"ext"`
	MetadataName  string
}

type jwtTokenExt struct {
	IsAdmin bool   `json:"is_admin"`
	ConnID  string `json:"conn_id"`
}

func ParseJWTFromHeader(request *restful.Request) (*JWEToken, error) {
	var rawToken string
	authorization := request.HeaderParameter("Authorization")
	if strings.TrimSpace(authorization) == "" {
		return nil, errors.New("Authentication head does not exist")
	}
	fmt.Printf("authorization header: %s\r\n", authorization)
	switch {
	case strings.HasPrefix(strings.TrimSpace(authorization), "Bearer"):
		rawToken = strings.TrimPrefix(strings.TrimSpace(authorization), "Bearer")
	case strings.HasPrefix(strings.TrimSpace(authorization), "bearer"):
		rawToken = strings.TrimPrefix(strings.TrimSpace(authorization), "bearer")
	}
	return ParseJWT(rawToken)
}

func ParseJWT(rawToken string) (*JWEToken, error) {
	var (
		token JWEToken
	)

	if rawToken == "" {
		return nil, errors.New("Authentication head is invalid")
	}
	parts := strings.Split(rawToken, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("oidc: malformed jwt, expected 3 parts got %d", len(parts))
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("oidc: malformed jwt payload: %v", err)
	}
	if err := json.Unmarshal(payload, &token); err != nil {
		fmt.Println(err)
		return nil, err
	}
	token.MetadataName = GetUserMetadataName(token.Email)

	return &token, nil
}

func GetUserMetadataName(userID string) string {
	md5Ctx := md5.New()
	md5Ctx.Write([]byte(strings.TrimSpace(userID)))
	cipherStr := md5Ctx.Sum(nil)
	return hex.EncodeToString(cipherStr)
}

func CovertMap(obj interface{}) map[string]interface{} {
	newMap := make(map[string]interface{})

	switch obj := obj.(type) {
	case map[interface{}]interface{}:
		for key, value := range obj {
			switch key := key.(type) {
			case string:
				switch value := value.(type) {
				case string:
					newMap[key] = value
				case bool:
					newMap[key] = value
				case []byte:
					newMap[key] = value
				case map[interface{}]interface{}:
					newMap[key] = CovertMap(value)
				case []interface{}:
					for _, item := range value {
						newMap[key] = CovertMap(item)
					}
				}
			}
		}
	}

	return newMap
}

// ToAuthenticationModes transforms array of authentication mode strings to valid AuthenticationModes type.
func ToAuthenticationModes(modes []string) AuthenticationModes {
	result := AuthenticationModes{}
	modesMap := map[string]bool{}

	for _, mode := range []AuthenticationMode{Token, Basic} {
		modesMap[mode.String()] = true
	}

	for _, mode := range modes {
		if _, exists := modesMap[mode]; exists {
			result.Add(AuthenticationMode(mode))
		}
	}

	return result
}

// ShouldRejectRequest returns true if url contains name and namespace of resource that should be filtered out from
// dashboard.
func ShouldRejectRequest(url string) bool {
	// For now we have only one resource that should be checked
	return strings.Contains(url, EncryptionKeyHolderName) && strings.Contains(url, EncryptionKeyHolderNamespace)
}

// GetClient returns a HTTP client with CA root pool if provided
func GetClient(rootCAFilePath, rootCAContent string) (*http.Client, error) {
	tlsConfig := tls.Config{RootCAs: x509.NewCertPool()}
	var (
		rootCABytes []byte
		err         error
	)
	if rootCAContent != "" {
		rootCABytes = []byte(rootCAContent)

	} else if rootCAFilePath != "" {
		rootCABytes, err = ioutil.ReadFile(rootCAFilePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read root-ca: %v", err)
		}
	}
	if !tlsConfig.RootCAs.AppendCertsFromPEM(rootCABytes) {
		return nil, fmt.Errorf("no certs found in root CA file %s", rootCABytes)
	}
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tlsConfig,
			Proxy:           http.ProxyFromEnvironment,
			Dial: (&net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 30 * time.Second,
			}).Dial,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
	}, nil
}
