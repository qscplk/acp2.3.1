import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiModule } from '@app/api';
import { FeatureSharedCommonModule } from '@app/features-shared/common';
import { SharedModule } from '@app/shared';

import {
  SecretCreateDialogComponent,
  SecretDetailComponent,
  SecretEditComponent,
  SecretListComponent,
  SecretUpdateDataDialogComponent,
  SecretUpdateDisplayNameDialogComponent,
} from './components';
import { SecretActions } from './services/acitons';

const EXPORTS = [
  SecretEditComponent,
  SecretCreateDialogComponent,
  SecretListComponent,
  SecretDetailComponent,
  SecretUpdateDisplayNameDialogComponent,
  SecretUpdateDataDialogComponent,
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    FormsModule,
    ApiModule,
    FeatureSharedCommonModule,
  ],
  declarations: EXPORTS,
  exports: EXPORTS,
  entryComponents: [
    SecretCreateDialogComponent,
    SecretUpdateDisplayNameDialogComponent,
    SecretUpdateDataDialogComponent,
  ],
  providers: [SecretActions],
})
export class SecretModule {}
