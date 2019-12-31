import { TranslateModule } from '@alauda/common-snippet';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PipesModule } from '../../pipes/pipes.module';

import { NoDataComponent } from './no-data.component';

@NgModule({
  imports: [CommonModule, TranslateModule, PipesModule],
  declarations: [NoDataComponent],
  exports: [NoDataComponent],
})
export class NoDataModule {}
