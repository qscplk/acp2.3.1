import { NgModule } from '@angular/core';
import { FOR_WORKSPACE, MODULE_ENV } from '@app/modules/secret';

import { ForWorkspaceRoutingModule } from './for-workspace-routing.module';
import { SecretsModule } from './secrets.module';

@NgModule({
  imports: [SecretsModule, ForWorkspaceRoutingModule],
  providers: [{ provide: MODULE_ENV, useValue: FOR_WORKSPACE }],
})
export class ForWorkspaceModule {}
