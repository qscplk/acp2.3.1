import { NgModule } from '@angular/core';
import { CodeApiService } from '@app/api/code/code-api.service';
import { JenkinsApiService } from '@app/api/jenkins/jenkins-api.service';
import { PipelineApiService } from '@app/api/pipeline/pipeline-api.service';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { ReportsApiService } from '@app/api/reports/reports-api.service';
import { ShallowIntegrationApiService } from '@app/api/shallow-integration/shallow-integration-api.service';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';

import { ApplicationApiService } from './application/application-api.service';
import { CodeQualityApiService } from './code-quality/code-quality-api.service';
import { ConfigSecretApiService } from './config-secret/config-secret-api.service';
import { ConfigMapApiService } from './configmap/configmap-api.service';
import { ProjectManagementApiService } from './project-management/project-management.service';
import { ProjectApiService } from './project/project-api.service';
import { SecretApiService } from './secret/secret-api.service';
import { StorageApiService } from './storage/storage-api.service';
import { ArtifactRegistryApiService } from './tool-chain/artifact-registry-api.service';

@NgModule({
  providers: [
    ProjectApiService,
    SecretApiService,
    CodeApiService,
    PipelineApiService,
    JenkinsApiService,
    ApplicationApiService,
    ToolChainApiService,
    RegistryApiService,
    ReportsApiService,
    ShallowIntegrationApiService,
    ConfigMapApiService,
    ConfigSecretApiService,
    StorageApiService,
    SecretApiService,
    CodeQualityApiService,
    ArtifactRegistryApiService,
    ProjectManagementApiService,
  ],
})
export class ApiModule {}
