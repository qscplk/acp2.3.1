package handler

import (
	"testing"

	"alauda.io/diablo/src/backend/client"
	"alauda.io/diablo/src/backend/errors"
	"alauda.io/diablo/src/backend/settings"
	"github.com/emicklei/go-restful"
	"github.com/stretchr/testify/assert"
)

func getAPIHandler() APIHandler {
	cManager := client.NewDevopsClientManager("", "http://localhost:8080", true, "")
	sManager := settings.NewSettingsManager(cManager)
	apiHandler := APIHandler{iManager: nil, cManager: cManager, sManager: sManager}
	return apiHandler
}

func TestAPIHandlerDevops(t *testing.T) {
	apiHandler := getAPIHandler()

	type Table struct {
		name     string
		input    *restful.Request
		expected *restful.Response
		err      error
		method   func(req *restful.Request, res *restful.Response)
	}

	tests := []Table{
		{
			name:     "handle oauth callback: without code",
			input:    &restful.Request{},
			expected: &restful.Response{},
			method:   apiHandler.handleOAuthCallback,
		},
	}
	for _, test := range tests {
		response := &restful.Response{}

		t.Run(test.name, func(t *testing.T) {
			// todo sy
			//test.method(test.input, response)

			if test.err != nil {
				errors.HandleInternalError(response, test.err)
				t.Errorf("error when handle callback %v", test.err)
			}
			assert.Equal(t, test.expected, response)
		})
	}
}

func TestHandlePipelinetemplatecategories(t *testing.T) {
	apiHandler := getAPIHandler()

	type Table struct {
		name     string
		input    *restful.Request
		expected *restful.Response
		err      error
		method   func(req *restful.Request, res *restful.Response)
	}

	tests := []Table{
		{
			name:     "get categories",
			input:    &restful.Request{},
			expected: &restful.Response{},
			method:   apiHandler.handlePipelinetemplatecategories,
		},
	}

	for _, test := range tests {
		response := &restful.Response{}

		// test.method(test.input, response)

		t.Run(test.name, func(t *testing.T) {
			if test.err != nil {
				errors.HandleInternalError(response, test.err)
				t.Errorf("error when handle callback %v", test.err)
			}
			assert.Equal(t, test.expected, response)
		})
	}
}
