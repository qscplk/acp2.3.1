import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CodeQualityModule } from '@app/modules/code-quality';
import { SharedModule } from '@app/shared';

import { CodeQualityProjectListPageComponent } from './list-page/list-page.component';
import { CodeQualityProjectsRoutingModule } from './routing.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    CodeQualityProjectsRoutingModule,
    CodeQualityModule,
  ],
  declarations: [CodeQualityProjectListPageComponent],
  exports: [],
})
export class CodeQualityProjectsModule {}
