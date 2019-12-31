import { TranslateModule } from '@alauda/common-snippet';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ForceUnbindModule } from '@app/shared/components/force-unbind/force-unbind.module';
import { MenuTriggerModule } from '@app/shared/components/menu-trigger/menu-trigger.module';
import { TagIconModule } from '@app/shared/components/tag-icon/tag-icon.module';

import { BreadcrumbModule } from './breadcrumb/breadcrumb.module';
import { ConfirmModule } from './confirm';
import { ErrorViewsModule } from './error-views';
import { LoadingModule } from './loading/loading.module';
import { LogViewModule } from './log-view';
import { LogoModule } from './logo/logo.module';
import { NoDataModule } from './no-data';
import { OAuthValidatorModule } from './oauth-validator';
import { PasswordModule } from './password';
import { ShellModule } from './shell/shell.module';
import { StatusIconModule } from './status-icon/status-icon.module';

@NgModule({
  imports: [
    CommonModule,
    PasswordModule,
    LogoModule,
    BreadcrumbModule,
    ErrorViewsModule,
    ConfirmModule,
    LogViewModule,
    MenuTriggerModule,
    StatusIconModule,
    TagIconModule,
    TranslateModule,
    NoDataModule,
    ForceUnbindModule,
    LoadingModule,
    OAuthValidatorModule,
  ],
  exports: [
    PasswordModule,
    LogoModule,
    BreadcrumbModule,
    ErrorViewsModule,
    ConfirmModule,
    LogViewModule,
    MenuTriggerModule,
    ShellModule,
    StatusIconModule,
    TagIconModule,
    NoDataModule,
    ForceUnbindModule,
    LoadingModule,
    OAuthValidatorModule,
  ],
})
export class ComponentsModule {}
