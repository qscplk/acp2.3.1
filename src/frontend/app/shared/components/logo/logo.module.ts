import { CommonLayoutModule } from '@alauda/common-snippet';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { LogoComponent } from './logo.component';

@NgModule({
  imports: [CommonModule, CommonLayoutModule],
  declarations: [LogoComponent],
  exports: [LogoComponent],
})
export class LogoModule {}
