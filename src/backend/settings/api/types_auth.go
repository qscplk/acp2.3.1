package api

import (
	"encoding/json"
	"strconv"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// SettingsAuthConfigMapName contains a name of config map, that stores auth settings.
	SettingsAuthConfigMapName = "auth-config"

	// SettingsAuthConfigMapNamespace contains a namespace of config map, that stores auth settings.
	SettingsAuthConfigMapNamespace = "alauda-system"

	// SettingsAuthGlobalConfigKey key for auth in devops-config configmap
	SettingsAuthGlobalConfigKey = "_auth"

	// SettingsCustomRedirectKey used for the custom redirect directly do devops
	SettingsCustomRedirectKey = "devops"
)

// AuthSettings stores auth configs
type AuthSettings struct {
	Enabled           bool              `json:"enabled"`
	ClientID          string            `json:"client_id"`
	ClientSecret      string            `json:"client_secret"`
	RedirectURI       string            `json:"redirect_uri"`
	Issuer            string            `json:"auth_issuer"`
	IssuerInner       string            `json:"auth_issuer_inner,omitempty"`
	Namespace         string            `json:"auth_namespace"`
	RootCAFile        string            `json:"root_ca_filepath"`
	RootCA            string            `json:"-"`
	Scopes            []string          `json:"scopes"`
	ResponseType      string            `json:"response_type"`
	CustomRedirectURI map[string]string `json:"custom_redirect_uri"`
}

// Marshal marshals to JSON string
func (s AuthSettings) Marshal() string {
	bytes, _ := json.Marshal(s)
	return string(bytes)
}

// UnmarshalAuth settings from JSON string into object.
func UnmarshalAuth(data string) (*AuthSettings, error) {
	s := new(AuthSettings)
	err := json.Unmarshal([]byte(data), s)
	return s, err
}

// GetData converts to a string map
func (s AuthSettings) GetData() (data map[string]string) {
	data = make(map[string]string)
	data["enabled"] = strconv.FormatBool(s.Enabled)
	data["client_id"] = s.ClientID
	data["client_secret"] = s.ClientSecret
	data["redirect_uri"] = s.RedirectURI
	data["auth_issuer"] = s.Issuer
	data["auth_namespace"] = s.Namespace
	data["root_ca_filepath"] = s.RootCAFile
	data["root_ca"] = s.RootCA
	data["scopes"] = strings.Join(s.Scopes, ",")
	data["response_type"] = s.ResponseType
	redirectConfig, err := json.Marshal(s.CustomRedirectURI)
	jsonString := string(redirectConfig)
	if s.CustomRedirectURI == nil || err != nil || jsonString == "" {
		jsonString = "{}"
	}
	data["custom_redirect_uri"] = jsonString
	return
}

// AuthSettingsFromData convert from configmap data to AuthSettings
func AuthSettingsFromData(data map[string]string) (sett *AuthSettings, err error) {
	s := GetAuthDefaultSettings()
	sett = &s
	if data == nil {
		return
	}
	if val, ok := data["enabled"]; ok {
		sett.Enabled, _ = strconv.ParseBool(val)
	}
	sett.ClientID = data["client_id"]
	sett.ClientSecret = data["client_secret"]
	sett.RedirectURI = data["redirect_uri"]
	sett.Issuer = data["auth_issuer"]
	sett.IssuerInner = data["auth_issuer_inner"]
	sett.Namespace = data["auth_namespace"]
	sett.RootCAFile = data["root_ca_filepath"]
	sett.RootCA = data["root_ca"]
	sett.ResponseType = data["response_type"]
	sett.Scopes = strings.Split(data["scopes"], ",")
	sett.CustomRedirectURI = make(map[string]string)
	if jsonString, ok := data["custom_redirect_uri"]; ok {
		json.Unmarshal([]byte(jsonString), &sett.CustomRedirectURI)
	}
	return
}

// GetAuthDefaultSettings returns the default Auth configuration
func GetAuthDefaultSettings() AuthSettings {
	return AuthSettings{
		Enabled:      false,
		Scopes:       []string{"openid", "profile", "email", "groups"},
		ResponseType: "code",
	}
}

// GetAuthDefaultSettingsConfigMap returns config map with default settings.
func GetAuthDefaultSettingsConfigMap() *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      SettingsAuthConfigMapName,
			Namespace: SettingsAuthConfigMapNamespace,
		},
		TypeMeta: metav1.TypeMeta{
			Kind:       ConfigMapKindName,
			APIVersion: ConfigMapAPIVersion,
		},
		Data: GetAuthDefaultSettings().GetData(),
	}
}

func addAuthDefaults(config map[string]string) map[string]string {
	config[SettingsAuthGlobalConfigKey] = GetAuthDefaultSettings().Marshal()

	return config
}
