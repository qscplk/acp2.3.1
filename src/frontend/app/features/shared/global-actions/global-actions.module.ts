import { CodeEditorModule } from '@alauda/code-editor';
import { TranslateModule } from '@alauda/common-snippet';
import {
  ButtonModule,
  DialogModule,
  DropdownModule,
  IconModule,
  MessageModule,
} from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PipesModule } from '../../../../app/shared/pipes/pipes.module';

import { GlobalActionsComponent } from './global-actions.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CodeEditorModule,
    MessageModule,
    ButtonModule,
    TranslateModule,
    IconModule,
    DropdownModule,
    DialogModule,
    PipesModule,
  ],
  declarations: [GlobalActionsComponent],
  exports: [GlobalActionsComponent],
})
export class GlobalActionsModule {}
