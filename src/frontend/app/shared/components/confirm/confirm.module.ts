import { TranslateModule } from '@alauda/common-snippet';
import { ButtonModule, IconModule, DialogModule } from '@alauda/ui';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ConfirmComponent } from './confirm.component';

@NgModule({
  imports: [
    CommonModule,
    ButtonModule,
    IconModule,
    TranslateModule,
    DialogModule,
  ],
  declarations: [ConfirmComponent],
  exports: [ConfirmComponent],
  entryComponents: [ConfirmComponent],
})
export class ConfirmModule {}
