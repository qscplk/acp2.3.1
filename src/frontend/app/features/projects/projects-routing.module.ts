import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BindingKind, ToolKind } from '@app/api/tool-chain/utils';
import { ProjectJenkinsBindingCreatePageComponent } from '@app/features/projects/jenkins-binding-create-page/jenkins-binding-create-page.component';
import { JenkinsBindingDetailPageComponent } from '@app/features/projects/jenkins-binding-detail-page/jenkins-binding-detail-page.component';
import { ProjectManagementBindingDetailPageComponent } from '@app/features/projects/project-management-binding-detail-page/project-management-binding-detail-page.component';
import { RegistryBindingCreatePageComponent } from '@app/features/projects/registry-binding-create-page/registry-binding-create-page.component';
import { RegistryBindingDetailPageComponent } from '@app/features/projects/registry-binding-detail-page/registry-binding-detail-page.component';
import { TagListPageComponent } from '@app/features/projects/registry-tag-list-page/tag-list-page.component';

import { ArtifactRegistryBindingCreatePageComponent } from './artifact-registry-binding-create-page/artifact-registry-binding-create-page.component';
import { ArtifactRegistryBindingDetailPageComponent } from './artifact-registry-binding-detail-page/artifact-registry-binding-detail-page.component';
import { ProjectCodeBindingCreatePageComponent } from './code-binding-create-page/code-binding-create-page.component';
import { ProjectCodeBindingDetailPageComponent } from './code-binding-detail-page/code-binding-detail-page.component';
import { ProjectCodeQualityBindingCreatePageComponent } from './code-quality-binding-create-page/code-quality-binding-create-page.component';
import { ProjectCodeQualityBindingDetailPageComponent } from './code-quality-binding-detail-page/code-quality-binding-detail-page.component';
import { ProjectDetailPageComponent } from './detail-page/detail-page.component';
import { ProjectListPageComponent } from './list-page/list-page.component';
import { ProjectManagementBindingCreatePageComponent } from './project-management-binding-create-page/project-management-binding-create-page';

const routes: Routes = [
  { path: '', component: ProjectListPageComponent },
  { path: ':name', component: ProjectDetailPageComponent },
  {
    path: `:name/create-binding/${ToolKind.CodeRepo}/:service`,
    component: ProjectCodeBindingCreatePageComponent,
  },
  {
    path: `:name/create-binding/${ToolKind.Jenkins}/:service`,
    component: ProjectJenkinsBindingCreatePageComponent,
  },
  {
    path: `:name/create-binding/${ToolKind.Registry}/:service`,
    component: RegistryBindingCreatePageComponent,
  },
  {
    path: `:name/create-binding/${ToolKind.CodeQuality}/:service`,
    component: ProjectCodeQualityBindingCreatePageComponent,
  },
  {
    path: `:name/create-binding/${ToolKind.ArtifactRegistry}/:service`,
    component: ArtifactRegistryBindingCreatePageComponent,
  },
  {
    path: `:name/create-binding/${ToolKind.ProjectManagement}/:service`,
    component: ProjectManagementBindingCreatePageComponent,
  },
  {
    path: `:name/${BindingKind.CodeRepo}/:codeBindingName`,
    component: ProjectCodeBindingDetailPageComponent,
  },
  {
    path: `:name/${BindingKind.Registry}/:bindingName`,
    component: RegistryBindingDetailPageComponent,
  },
  {
    path: `:name/${BindingKind.Jenkins}/:bindingName`,
    component: JenkinsBindingDetailPageComponent,
  },
  {
    path: `:name/${BindingKind.Registry}/:bindingName/:repoName`,
    component: TagListPageComponent,
  },
  {
    path: `:name/${BindingKind.CodeQuality}/:bindingName`,
    component: ProjectCodeQualityBindingDetailPageComponent,
  },
  {
    path: `:name/${BindingKind.ArtifactRegistry}/:bindingName`,
    component: ArtifactRegistryBindingDetailPageComponent,
  },
  {
    path: `:name/${BindingKind.ProjectManagement}/:bindingName`,
    component: ProjectManagementBindingDetailPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectsRoutingModule {}
