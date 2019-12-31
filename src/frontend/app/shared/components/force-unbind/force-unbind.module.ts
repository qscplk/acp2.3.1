import { TranslateModule } from '@alauda/common-snippet';
import { ButtonModule, DialogModule, FormModule, IconModule } from '@alauda/ui';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';

@NgModule({
  imports: [
    DialogModule,
    IconModule,
    TranslateModule,
    FormsModule,
    FormModule,
    ButtonModule,
  ],
  declarations: [ForceUnbindComponent],
  exports: [ForceUnbindComponent],
  entryComponents: [ForceUnbindComponent],
})
export class ForceUnbindModule {}
