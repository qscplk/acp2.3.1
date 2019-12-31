import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SecretModule } from '@app/modules/secret';
import { SharedModule } from '@app/shared';

import { SecretCreateComponent } from './create/secret-create.component';
import { SecretDetailPageComponent } from './detail-page/detail-page.component';
import { SecretListPageComponent } from './list-page/list-page.component';

@NgModule({
  declarations: [
    SecretListPageComponent,
    SecretDetailPageComponent,
    SecretCreateComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    SecretModule,
  ],
  providers: [],
})
export class SecretsModule {
  constructor() {}
}
