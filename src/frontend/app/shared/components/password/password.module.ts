import { IconModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PasswordComponent } from './password.component';

@NgModule({
  imports: [CommonModule, IconModule],
  declarations: [PasswordComponent],
  exports: [PasswordComponent],
})
export class PasswordModule {}
