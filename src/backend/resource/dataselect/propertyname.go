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

package dataselect

// PropertyName is used to get the value of certain property of data cell.
// For example if we want to get the namespace of certain Deployment we can use DeploymentCell.GetProperty(NamespaceProperty)
type PropertyName string

// List of all property names supported by the UI.
const (
	NameProperty                       = "name"
	NameLengthProperty                 = "nameLength"
	CreationTimestampProperty          = "creationTimestamp"
	NamespaceProperty                  = "namespace"
	StatusProperty                     = "status"
	ScopeProperty                      = "scope"
	KindProperty                       = "kind"
	DisplayNameProperty                = "displayName"
	DisplayEnNameProperty              = "displayEnName"
	DisplayZhNameProperty              = "displayZhName"
	DomainProperty                     = "domain"
	LabelProperty                      = "label"
	SecretTypeProperty                 = "secretType"
	ProjectProperty                    = "project"
	ProductNameProperty                = "productName"
	PipelineConfigProperty             = "pipelineConfig"
	CodeRepoServiceProperty            = "codeRepoService"
	CodeRepoBindingProperty            = "codeRepoBinding"
	CodeRepositoryProperty             = "codeRepository"
	CodeQualityBindingProperty         = "codeQualityBinding"
	ExactNameProperty                  = "exactName"
	LabelEqualProperty                 = "labelEq"
	JenkinsProperty                    = "jenkins"
	JenkinsBindingProperty             = "jenkinsBinding"
	StartedAtProperty                  = "startedAt"
	PipelineCreationTimestampProperty  = "pipelineCreationTimestamp"
	ImageRegistryProperty              = "imageRegistry"
	ImageRegistryBindingProperty       = "imageRegistryBinding"
	ImageRepositoryProperty            = "imageRepository"
	LatestCommitAt                     = "latestCommitAt"
	MicroservicesConfigProfileProperty = "profile"
	MicroservicesConfigLabelProperty   = "label"
	CategoryProperty                   = "category"
	MultiBranchCategoryProperty        = "multiBranchCategory"
	MultiBranchNameProperty            = "multiBranchName"
	PipelineStatusProperty             = "pipelineStatus"
	ASMHostName                        = "asmHost"
)
