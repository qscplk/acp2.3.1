import { PageModule, PlatformNavModule } from '@alauda/ui';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { GlobalActionsModule } from '../shared/global-actions';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';

@NgModule({
  imports: [
    CommonModule,
    PortalModule,
    SharedModule,
    PageModule,
    PlatformNavModule,
    GlobalActionsModule,
    AdminRoutingModule,
  ],
  declarations: [AdminComponent],
  providers: [],
})
export class AdminModule {}
