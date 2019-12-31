import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CodeQualityModule } from '@app/modules/code-quality';
import { PipelineModule } from '@app/modules/pipeline/pipeline.module';
import { ReportsModule } from '@app/modules/reports';
import { SharedModule } from '@app/shared';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    DashboardRoutingModule,
    ReportsModule,
    PipelineModule,
    CodeQualityModule,
  ],
  declarations: [DashboardComponent],
})
export class DashboardModule {}
