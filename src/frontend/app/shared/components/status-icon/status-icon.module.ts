import { IconModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { StatusIconComponent } from './status-icon.component';

@NgModule({
  imports: [CommonModule, IconModule],
  declarations: [StatusIconComponent],
  exports: [StatusIconComponent],
})
export class StatusIconModule {}
