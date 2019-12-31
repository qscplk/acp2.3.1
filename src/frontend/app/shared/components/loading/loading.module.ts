import { IconModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { LoadingComponent } from './loading.component';

@NgModule({
  imports: [CommonModule, IconModule],
  declarations: [LoadingComponent],
  exports: [LoadingComponent],
})
export class LoadingModule {}
