import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectJenkinsBindingCreatePageComponent } from '@app/features/projects/jenkins-binding-create-page/jenkins-binding-create-page.component';
import { JenkinsBindingDetailPageComponent } from '@app/features/projects/jenkins-binding-detail-page/jenkins-binding-detail-page.component';
import { RegistryBindingCreatePageComponent } from '@app/features/projects/registry-binding-create-page/registry-binding-create-page.component';
import { RegistryBindingDetailPageComponent } from '@app/features/projects/registry-binding-detail-page/registry-binding-detail-page.component';
import { TagListPageComponent } from '@app/features/projects/registry-tag-list-page/tag-list-page.component';
import { CodeModule } from '@app/modules/code';
import { CodeQualityModule } from '@app/modules/code-quality';
import { JenkinsBindingModule } from '@app/modules/jenkins-binding';
import { ProjectManagementModule } from '@app/modules/porject-management/project-management.module';
import { ProjectModule } from '@app/modules/project';
import { RegistryCommonModule } from '@app/modules/registry/registry-common.module';
import { ToolChainCommonModule } from '@app/modules/tool-chain/tool-chain-common.module';
import { SharedModule } from '@app/shared';

import { ArtifactRegistryBindingCreatePageComponent } from './artifact-registry-binding-create-page/artifact-registry-binding-create-page.component';
import { ArtifactRegistryBindingDetailPageComponent } from './artifact-registry-binding-detail-page/artifact-registry-binding-detail-page.component';
import { ProjectCodeBindingCreatePageComponent } from './code-binding-create-page/code-binding-create-page.component';
import { ProjectCodeBindingDetailPageComponent } from './code-binding-detail-page/code-binding-detail-page.component';
import { ProjectCodeQualityBindingCreatePageComponent } from './code-quality-binding-create-page/code-quality-binding-create-page.component';
import { ProjectCodeQualityBindingDetailPageComponent } from './code-quality-binding-detail-page/code-quality-binding-detail-page.component';
import { ProjectDetailPageComponent } from './detail-page/detail-page.component';
import { ProjectListPageComponent } from './list-page/list-page.component';
import { ProjectManagementBindingCreatePageComponent } from './project-management-binding-create-page/project-management-binding-create-page';
import { ProjectManagementBindingDetailPageComponent } from './project-management-binding-detail-page/project-management-binding-detail-page.component';
import { ProjectsRoutingModule } from './projects-routing.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    ProjectsRoutingModule,
    ProjectModule,
    CodeModule,
    RegistryCommonModule,
    CodeQualityModule,
    JenkinsBindingModule,
    ToolChainCommonModule,
    ProjectManagementModule,
  ],
  declarations: [
    ProjectListPageComponent,
    ProjectDetailPageComponent,
    ProjectCodeBindingDetailPageComponent,
    ProjectCodeBindingCreatePageComponent,
    ProjectJenkinsBindingCreatePageComponent,
    RegistryBindingCreatePageComponent,
    RegistryBindingDetailPageComponent,
    ProjectCodeQualityBindingCreatePageComponent,
    ProjectCodeQualityBindingDetailPageComponent,
    TagListPageComponent,
    JenkinsBindingDetailPageComponent,
    ArtifactRegistryBindingCreatePageComponent,
    ArtifactRegistryBindingDetailPageComponent,
    ProjectManagementBindingCreatePageComponent,
    ProjectManagementBindingDetailPageComponent,
  ],
  entryComponents: [],
})
export class ProjectsModule {}
