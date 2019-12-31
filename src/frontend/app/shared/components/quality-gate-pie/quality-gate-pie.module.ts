import { TranslateModule } from '@alauda/common-snippet';
import { TooltipModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PipesModule } from '../../pipes/pipes.module';

import { QualityGatePieComponent } from './quality-gate-pie.component';

@NgModule({
  imports: [CommonModule, PipesModule, TooltipModule, TranslateModule],
  declarations: [QualityGatePieComponent],
  exports: [QualityGatePieComponent],
})
export class QualityGatePieModule {}
