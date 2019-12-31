import { TranslateModule } from '@alauda/common-snippet';
import {
  ButtonModule,
  DialogModule,
  IconModule,
  NotificationModule,
} from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { OAuthValidatorComponent } from './oauth-validator.component';
import { OAuthValidatorService } from './oauth-validator.service';

@NgModule({
  declarations: [OAuthValidatorComponent],
  imports: [
    CommonModule,
    DialogModule,
    IconModule,
    TranslateModule,
    ButtonModule,
    NotificationModule,
  ],
  exports: [OAuthValidatorComponent],
  entryComponents: [OAuthValidatorComponent],
  providers: [OAuthValidatorService],
})
export class OAuthValidatorModule {}
