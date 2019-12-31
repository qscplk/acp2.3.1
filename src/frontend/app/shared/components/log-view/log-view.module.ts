import { CodeEditorModule } from '@alauda/code-editor';
import { TranslateModule } from '@alauda/common-snippet';
import { CheckboxModule, IconModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LogViewComponent } from './log-view.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CodeEditorModule,
    IconModule,
    CheckboxModule,
    TranslateModule,
  ],
  declarations: [LogViewComponent],
  exports: [LogViewComponent],
  entryComponents: [LogViewComponent],
})
export class LogViewModule {}
