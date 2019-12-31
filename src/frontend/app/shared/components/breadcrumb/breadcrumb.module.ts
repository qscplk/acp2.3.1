import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { BreadcrumbItemDirective } from './breadcrumb-item.directive';
import { BreadcrumbComponent } from './breadcrumb.component';

@NgModule({
  imports: [CommonModule],
  declarations: [BreadcrumbComponent, BreadcrumbItemDirective],
  exports: [BreadcrumbComponent, BreadcrumbItemDirective],
})
export class BreadcrumbModule {}
