import { DialogModule, TableOfContentsModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FeatureSharedCommonModule } from '@app/features-shared/common';
import { SharedModule } from '@app/shared';

import {
  BasicAuthEditorComponent,
  ConfigSecretCreateDialogComponent,
  ConfigSecretDataViwerComponent,
  ConfigSecretDetailComponent,
  ConfigSecretFormComponent,
  ConfigSecretListComponent,
  DockerconfigEditorComponent,
  SSHAuthEditorComponent,
  SecretCreateComponent,
  SecretUpdateComponent,
  TLSEditorComponent,
} from './components';
import { ConfigSecretActions } from './services/actions';

@NgModule({
  imports: [
    DialogModule,
    TableOfContentsModule,
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule,
    ReactiveFormsModule,
    FeatureSharedCommonModule,
  ],
  declarations: [
    ConfigSecretListComponent,
    ConfigSecretFormComponent,
    TLSEditorComponent,
    SSHAuthEditorComponent,
    BasicAuthEditorComponent,
    DockerconfigEditorComponent,
    ConfigSecretDetailComponent,
    ConfigSecretDataViwerComponent,
    SecretCreateComponent,
    SecretUpdateComponent,
    ConfigSecretCreateDialogComponent,
  ],
  exports: [
    ConfigSecretListComponent,
    ConfigSecretDetailComponent,
    SecretCreateComponent,
    SecretUpdateComponent,
    ConfigSecretCreateDialogComponent,
  ],
  entryComponents: [ConfigSecretCreateDialogComponent],
  providers: [ConfigSecretActions],
})
export class ConfigSecretModule {}
