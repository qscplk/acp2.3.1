import { CommonLayoutModule } from '@alauda/common-snippet';
import { PageModule, PlatformNavModule } from '@alauda/ui';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { GlobalActionsModule } from '../shared/global-actions';

import { NoNamespacePageComponent } from './no-namespace-page.component';
import { WorkspaceRoutingModule } from './workspace-routing.module';
import { WorkspaceComponent } from './workspace.component';

@NgModule({
  imports: [
    CommonModule,
    PortalModule,
    SharedModule,
    PageModule,
    GlobalActionsModule,
    PlatformNavModule,
    WorkspaceRoutingModule,
    CommonLayoutModule,
  ],
  declarations: [WorkspaceComponent, NoNamespacePageComponent],
})
export class WorkspaceModule {}
