package handler

import (
	"errors"
	"log"
	"regexp"
	"sync"

	"alauda.io/devops-apiserver/pkg/apis/devops"
	asfClient "alauda.io/diablo/src/backend/client/asf"
	"bitbucket.org/mathildetech/pass"
	restful "github.com/emicklei/go-restful"
)

type middleware restful.FilterFunction

var loginRegex = regexp.MustCompile("(.*)login(.*)")

const (
	// AllProducts all products key
	AllProducts = "all"
	// ACPDevops devops key
	ACPDevops = "acp-devops"
	// ACPServiceFramework asf key
	ACPServiceFramework = "acp-service-framework"
	// ACPServiceMesh service mesh key
	ACPServiceMesh = "acp-service-mesh"
)

// APIGroupValidator API group validation for license
type APIGroupValidator interface {
	Has(apigroup string) bool
}

// LicenseMiddlewareFactory provides functions to generate middlewares
type LicenseMiddlewareFactory struct {
	middlewares map[string]restful.FilterFunction
	lock        *sync.RWMutex
	skip        bool
}

// make sure the struct implements this interface
var _ APIGroupValidator = &LicenseMiddlewareFactory{}

// NewLicenseMiddlewareFactory constructor function for LicenseMiddlewareFactory
func NewLicenseMiddlewareFactory(skip bool) *LicenseMiddlewareFactory {
	return &LicenseMiddlewareFactory{
		lock:        &sync.RWMutex{},
		skip:        skip,
		middlewares: make(map[string]restful.FilterFunction),
	}
}

// Has returns true if the license for the api group is valid
func (l *LicenseMiddlewareFactory) Has(apigroup string) bool {
	switch apigroup {
	case devops.GroupName:
		if err := pass.CheckAppLicense(ACPDevops); err != nil {
			return false
		}
	case asfClient.AsfApiserverGroup:
		if err := pass.CheckAppLicense(ACPServiceFramework); err != nil {
			return false
		}
	}
	return true
}

// get return a middleware function used in a API method
func (l *LicenseMiddlewareFactory) get(midd string) restful.FilterFunction {
	if l.skip {
		return l.Next
	}
	l.lock.RLock()
	md, ok := l.middlewares[midd]
	l.lock.RUnlock()
	if !ok {
		l.lock.Lock()
		switch midd {
		case AllProducts, "":
			md = l.allHandler
		default:
			md = func(request *restful.Request, response *restful.Response, chain *restful.FilterChain) {
				if err := pass.CheckAppLicense(midd); err != nil {
					l.handleError(midd, err, response)
					return
				}
				chain.ProcessFilter(request, response)
			}
		}
		l.middlewares[midd] = md
		l.lock.Unlock()
	}
	return md
}

// Next invokes next handler in the chain
func (l *LicenseMiddlewareFactory) Next(request *restful.Request, response *restful.Response, chain *restful.FilterChain) {
	chain.ProcessFilter(request, response)
}

// All returns a middleware function that validates licenses of all related products and returns goes to next if any one is valid
func (l *LicenseMiddlewareFactory) All() restful.FilterFunction {
	return l.get(AllProducts)
}

// Product returns a middleware function thatn validates a specific productId's license
func (l *LicenseMiddlewareFactory) Product(productId string) restful.FilterFunction {
	return l.get(productId)
}

func (l *LicenseMiddlewareFactory) allHandler(request *restful.Request, response *restful.Response, chain *restful.FilterChain) {
	// ignore login for license
	if loginRegex.MatchString(request.SelectedRoutePath()) {
		l.Next(request, response, chain)
		return
	}
	licenses, err := pass.GetLicenses()
	if err != nil {
		log.Printf("Get all products license failed: %v", err)
		l.handleError("", err, response)
		return
	}
	errLicenses := ""
	errMsgs := ""
	count := 0
	if len(licenses) > 0 {
		for _, l := range licenses {
			if l != nil {
				// if any is valid we can go ahead
				if l.IsValid() {
					break
				}
				count++
				if errLicenses == "" {
					errLicenses = l.AppID
					errMsgs = l.Message
				} else {
					errLicenses += "," + l.AppID
					errMsgs += "," + l.Message
				}
			}
		}
	}
	// if all licenses are bad...
	if count == len(licenses) {
		l.handleError(errLicenses, errors.New(errMsgs), response)
		return
	}
	chain.ProcessFilter(request, response)
}

// ErrorResponse error response format in license middleware
type ErrorResponse struct {
	AppID string `json:"app_id"`
	Err   string `json:"error"`
}

func (l *LicenseMiddlewareFactory) handleError(productId string, err error, response *restful.Response) {
	if productId == "" {
		productId = pass.ACPGroup
	}
	message := ErrorResponse{
		AppID: productId,
		Err:   err.Error(),
	}
	response.WriteHeaderAndJson(402, message, "application/json")

}
