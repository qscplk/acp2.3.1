import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PipelineHistoryDetailComponent } from '@app/features/pipelines/history-detail/history-detail.component';

import { PipelineCreateComponent } from './create/pipeline-create.component';
import { PipelineDetailComponent } from './detail/pipeline-detail.component';
import { ListPageComponent } from './list/list-page.component';
import { PipelineUpdateComponent } from './update/pipeline-update.component';
import { PipelineVisualCreatePageComponent } from './visual-editor/create';
import { PipelineVisualUpdatePageComponent } from './visual-editor/update';

const routes: Routes = [
  { path: ':category', component: ListPageComponent },
  { path: ':category/create', component: PipelineCreateComponent },
  {
    path: ':category/visual-create',
    component: PipelineVisualCreatePageComponent,
  },
  {
    path: ':category/:name/visual-update',
    component: PipelineVisualUpdatePageComponent,
  },
  { path: ':category/:name/update', component: PipelineUpdateComponent },
  { path: ':category/:name', component: PipelineDetailComponent },
  {
    path: ':category/:name/:historyName',
    component: PipelineHistoryDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PipelinesRoutingModule {}
