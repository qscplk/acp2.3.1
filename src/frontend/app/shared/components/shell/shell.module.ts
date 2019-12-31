import { TranslateModule } from '@alauda/common-snippet';
import { IconModule, TooltipModule } from '@alauda/ui';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { StatusIconModule } from '../status-icon/status-icon.module';

import { ShellComponent } from './shell.component';

@NgModule({
  imports: [
    CommonModule,
    IconModule,
    TranslateModule,
    StatusIconModule,
    TooltipModule,
  ],
  declarations: [ShellComponent],
  exports: [ShellComponent],
})
export class ShellModule {}
