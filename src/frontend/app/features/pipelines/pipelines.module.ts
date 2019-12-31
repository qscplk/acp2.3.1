import { CodeEditorModule } from '@alauda/code-editor';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PipelineModule } from '@app/modules/pipeline/pipeline.module';

import { SharedModule } from '../../shared';

import { PipelineCreateComponent } from './create/pipeline-create.component';
import { PipelineDetailComponent } from './detail/pipeline-detail.component';
import { PipelineHistoryDetailComponent } from './history-detail/history-detail.component';
import { ListPageComponent } from './list/list-page.component';
import { PipelinesRoutingModule } from './pipelines-routing.module';
import { PipelineUpdateComponent } from './update/pipeline-update.component';
import { PipelineVisualCreatePageComponent } from './visual-editor/create';
import { PipelineVisualUpdatePageComponent } from './visual-editor/update';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    CodeEditorModule,
    PipelinesRoutingModule,
    PipelineModule,
  ],
  declarations: [
    ListPageComponent,
    PipelineDetailComponent,
    PipelineCreateComponent,
    PipelineUpdateComponent,
    PipelineHistoryDetailComponent,
    PipelineVisualCreatePageComponent,
    PipelineVisualUpdatePageComponent,
  ],
})
export class PipelinesModule {}
