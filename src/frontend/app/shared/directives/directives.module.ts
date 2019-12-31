import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AsyncDataDirective } from './async-data.directive';
import { DisableControlDirective } from './disable-control.directive';
import { PageHeaderContentDirective } from './page-header-content.directive';
import { ResizeDirective } from './resize.directive';

@NgModule({
  imports: [CommonModule, PortalModule],
  declarations: [
    PageHeaderContentDirective,
    AsyncDataDirective,
    ResizeDirective,
    DisableControlDirective,
  ],
  exports: [
    PageHeaderContentDirective,
    AsyncDataDirective,
    ResizeDirective,
    DisableControlDirective,
  ],
})
export class DirectivesModule {}
