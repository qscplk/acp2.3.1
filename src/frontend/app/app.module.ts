import { CodeEditorIntl, CodeEditorModule } from '@alauda/code-editor';
import { TranslateModule } from '@alauda/common-snippet';
import { THEME_SERVICE_CONFIG, ThemeServiceConfig } from '@alauda/theme';
import {
  MessageModule,
  NotificationModule,
  PaginatorIntl,
  TooltipCopyIntl,
} from '@alauda/ui';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MonacoProviderService } from 'ng-monaco-editor';

import { AppPaginatorIntl } from './app-paginator-intl';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {
  CustomCodeEditorIntlService,
  CustomTooltipIntlService,
  ServicesModule,
} from './services';
import { CustomMonacoProviderService } from './services/custom-monaco-provider';
import { SharedModule } from './shared';
import { en } from './translate/en.i18n';
import { zh } from './translate/zh.i18n';

const DEFAULT_MONACO_OPTIONS: monaco.editor.IEditorConstructionOptions = {
  fontSize: 12,
  folding: true,
  scrollBeyondLastLine: false,
  minimap: { enabled: false },
  mouseWheelZoom: true,
  scrollbar: {
    vertical: 'visible',
    horizontal: 'visible',
  },
  fixedOverflowWidgets: true,
};

const themeServiceConfig: ThemeServiceConfig = {
  api: '{{API_GATEWAY}}/devops/api/v1/configuration',
  productName: 'acp-devops',
  storageKey: 'platform_theme_acp',
  navLogoSelector: '.alo-logo',
  navBarSelector:
    '.aui-layout .aui-layout__toolbar, .aui-layout .aui-layout-nav-drawer__header, header.nav-bar.custom-nav-bar',
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    HttpClientModule,
    BrowserModule,
    BrowserAnimationsModule,
    ServicesModule,
    SharedModule,
    MessageModule,
    NotificationModule,
    // App routing module should stay at the bottom
    AppRoutingModule,

    // Translate
    TranslateModule.forRoot({
      loose: true,
      translations: { zh, en },
    }),

    CodeEditorModule.forRoot({
      // Angular CLI currently does not handle assets with hashes. We manage it by manually adding
      // version numbers to force library updates:
      baseUrl: 'lib/v1',
      defaultOptions: DEFAULT_MONACO_OPTIONS,
    }),
  ],
  providers: [
    {
      provide: MonacoProviderService,
      useClass: CustomMonacoProviderService,
    },
    {
      provide: PaginatorIntl,
      useClass: AppPaginatorIntl,
    },
    {
      provide: TooltipCopyIntl,
      useClass: CustomTooltipIntlService,
    },
    {
      provide: CodeEditorIntl,
      useClass: CustomCodeEditorIntlService,
    },
    {
      provide: THEME_SERVICE_CONFIG,
      useValue: themeServiceConfig,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
