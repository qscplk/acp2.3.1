import { NgModule } from '@angular/core';
import { FOR_ADMIN, MODULE_ENV } from '@app/modules/secret';

import { ForAdminRoutingModule } from './for-admin-routing.module';
import { SecretsModule } from './secrets.module';

@NgModule({
  imports: [SecretsModule, ForAdminRoutingModule],
  providers: [{ provide: MODULE_ENV, useValue: FOR_ADMIN }],
})
export class ForAdminModule {}
