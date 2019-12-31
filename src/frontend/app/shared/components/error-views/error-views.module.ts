import { TranslateModule } from '@alauda/common-snippet';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ErrorPageComponent } from './error-page.component';

@NgModule({
  imports: [CommonModule, TranslateModule],
  declarations: [ErrorPageComponent],
  exports: [ErrorPageComponent],
})
export class ErrorViewsModule {}
