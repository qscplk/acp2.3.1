import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SecretModule } from '@app/modules/secret/secret.module';
import { BindingListComponent } from '@app/modules/tool-chain/components/binding-list/binding-list.component';
import { IntegrateToolComponent } from '@app/modules/tool-chain/components/integrate-tool/integrate-tool.component';
import { ProjectBindingListComponent } from '@app/modules/tool-chain/components/project-binding-list/project-binding-list.component';
import { SelectServiceComponent } from '@app/modules/tool-chain/components/select-service/select-service.component';
import { ServiceListComponent } from '@app/modules/tool-chain/components/service-list/service-list.component';
import { ToolListComponent } from '@app/modules/tool-chain/components/tool-list/tool-list.component';
import { ToolTypeBarComponent } from '@app/modules/tool-chain/components/tool-type-bar/tool-type-bar.component';
import { UpdateToolComponent } from '@app/modules/tool-chain/components/update-tool/update-tool.component';
import { SharedModule } from '@app/shared';

import { CodeModule } from '../code';

import { AddRegistryComponent } from './components/add-registry/add-registry.component';
import { ArtifactManagerListComponent } from './components/artifact-manager-list/artifact-manager-list.component';
import { ArtifactRegistryBindingFormComponent } from './components/artifact-registry-binding-form/artifact-registry-binding-form.component';
import { ArtifactRegistryBindingOptionsComponent } from './components/artifact-registry-binding-options/artifact-registry-binding-options.component';
import { ForceDeleteComponent } from './components/force-delete/force-delete.component';
import { IntegrateFormComponent } from './components/integrate-form/integrate-form.component';
import { SelectProjectComponent } from './components/select-project/select-project.component';
import { UpdateArtifactRegistryBindingComponent } from './components/update-artifact-registry-binding/update-artifact-registry-binding.component';
import { UpdateArtifactRegistryComponent } from './components/update-artifact-registry/update-artifact-registry.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    SecretModule,
    CodeModule,
    ReactiveFormsModule,
  ],
  declarations: [
    ToolTypeBarComponent,
    ToolListComponent,
    ServiceListComponent,
    BindingListComponent,
    IntegrateToolComponent,
    UpdateToolComponent,
    ProjectBindingListComponent,
    SelectServiceComponent,
    ForceDeleteComponent,
    SelectProjectComponent,
    ArtifactManagerListComponent,
    IntegrateFormComponent,
    AddRegistryComponent,
    UpdateArtifactRegistryComponent,
    ArtifactRegistryBindingFormComponent,
    UpdateArtifactRegistryBindingComponent,
    ArtifactRegistryBindingOptionsComponent,
  ],
  exports: [
    ToolTypeBarComponent,
    ToolListComponent,
    ServiceListComponent,
    BindingListComponent,
    IntegrateToolComponent,
    UpdateToolComponent,
    ProjectBindingListComponent,
    SelectServiceComponent,
    ArtifactManagerListComponent,
    UpdateArtifactRegistryComponent,
    ArtifactRegistryBindingFormComponent,
    UpdateArtifactRegistryBindingComponent,
  ],
  entryComponents: [
    IntegrateToolComponent,
    UpdateToolComponent,
    SelectServiceComponent,
    ForceDeleteComponent,
    SelectProjectComponent,
    AddRegistryComponent,
    UpdateArtifactRegistryComponent,
    UpdateArtifactRegistryBindingComponent,
  ],
})
export class ToolChainCommonModule {}
