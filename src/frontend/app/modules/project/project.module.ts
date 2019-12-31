import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CodeModule } from '@app/modules/code';
import { PipelineModule } from '@app/modules/pipeline/pipeline.module';
import { ToolBindingsSectionComponent } from '@app/modules/project/components/tool-bindings-section/tool-bindings-section.component';
import { SecretModule } from '@app/modules/secret';
import { ToolChainCommonModule } from '@app/modules/tool-chain/tool-chain-common.module';
import { SharedModule } from '@app/shared';

import { ProjectDetailComponent, ProjectListComponent } from './components';

const Components = [
  ProjectListComponent,
  ProjectDetailComponent,
  ToolBindingsSectionComponent,
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedModule,
    SecretModule,
    CodeModule,
    ToolChainCommonModule,
    PipelineModule,
  ],
  declarations: Components,
  exports: Components,
})
export class ProjectModule {}
