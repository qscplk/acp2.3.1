import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared';

import {
  CodeRecentCommitsComponent,
  PipelineGlobalStatusChartComponent,
  PipelineRecentHistoriesComponent,
  PipelineStageStatusChartComponent,
  RegistryRecentPushsComponent,
} from './components';

const EXPORTS = [
  PipelineGlobalStatusChartComponent,
  PipelineStageStatusChartComponent,
  PipelineRecentHistoriesComponent,
  CodeRecentCommitsComponent,
  RegistryRecentPushsComponent,
];

@NgModule({
  imports: [CommonModule, RouterModule, SharedModule],
  declarations: EXPORTS,
  exports: EXPORTS,
})
export class ReportsModule {}
