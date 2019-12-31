import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfigSecretModule } from '@app/modules/config-secret/configsecret.module';

import { SharedModule } from '../../shared';

import { ConfigSecretsRoutingModule } from './config-secrets-routing.module';
import { ConfigSecretCreatePageComponent } from './create-page/create-page.component';
import { ConfigSecretDetailPageComponent } from './detail-page/detail-page.component';
import { ConfigSecretListPageComponent } from './list-page/list-page.component';
import { ConfigSecretUpdatePageComponent } from './update-page/update-page.component';

@NgModule({
  imports: [
    CommonModule,
    ConfigSecretModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ConfigSecretsRoutingModule,
  ],
  declarations: [
    ConfigSecretListPageComponent,
    ConfigSecretCreatePageComponent,
    ConfigSecretDetailPageComponent,
    ConfigSecretUpdatePageComponent,
  ],
})
export class ConfigSecretsModule {
  constructor() {}
}
