import {
  AuthorizationInterceptorService,
  CommonLayoutIntl,
  CommonLayoutModule,
  TOKEN_GLOBAL_NAMESPACE,
  TOKEN_RESOURCE_DEFINITIONS,
  TranslateService,
  TOKEN_BASE_DOMAIN,
} from '@alauda/common-snippet';
import { IconRegistryService } from '@alauda/ui';
import * as basicIconsUrl from '@alauda/ui/assets/basic-icons.svg';
import { PlatformLocation } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  Inject,
  InjectionToken,
  NgModule,
  Optional,
  SkipSelf,
} from '@angular/core';
import { ApiModule } from '@app/api';
import { RESOURCE_DEFINETIONS, createConstantsWithBaseDomain, TOKEN_CONSTANTS } from '@app/constants';
import { Environments, getEnvironments } from '@app/app-global';
import { NavControlService } from '@app/services/nav-control.service';
import { RoleService } from '@app/services/role.service';
import { TerminalService } from '@app/services/terminal.service';
import { UiStateService } from '@app/services/ui-state.service';
import { MonacoProviderService } from 'ng-monaco-editor';

import { ApiGatewayInterceptor } from './api-gateway-interceptor.service';
import { ENVIRONMENTS } from './environments.token';
import { GlobalLoadingInterceptor } from './global-loading.interceptor';
import { LayoutIntlService } from './layout-intl.service';
import { NAV_CONFIG_LOCAL_STORAGE_KEY } from './nav-loader.service';
import { PermissionService } from './permission.service';

export function getAppBaseHref(platformLocation: PlatformLocation): string {
  return platformLocation.getBaseHrefFromDOM();
}
// todo: move to common
export const TOKEN_CONSOLE_API_PREFIXES = new InjectionToken(
  'alauda-console api prefixes',
);

/**
 * Services in Angular App is static and singleton over the whole system,
 * so we will import them into the root module.
 *
 * This is to replace the Core module, which we believe is somewhat duplicates with the
 * purpose of global service module.
 */
@NgModule({
  imports: [CommonLayoutModule, ApiModule],
  providers: [
    PermissionService,
    MonacoProviderService,
    UiStateService,
    TerminalService,
    NavControlService,
    RoleService,
    {
      provide: ENVIRONMENTS,
      useFactory: getEnvironments,
    },
    {
      provide: TOKEN_GLOBAL_NAMESPACE,
      useFactory: (env: Environments) => env.GLOBAL_NAMESPACE,
      deps: [ENVIRONMENTS],
    },
    {
      provide: TOKEN_BASE_DOMAIN,
      useFactory: (env: Environments) => env.LABEL_BASE_DOMAIN,
      deps: [ENVIRONMENTS],
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiGatewayInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthorizationInterceptorService,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GlobalLoadingInterceptor,
      multi: true,
    },
    {
      provide: CommonLayoutIntl,
      useClass: LayoutIntlService,
    },
    {
      provide: TOKEN_RESOURCE_DEFINITIONS,
      useValue: RESOURCE_DEFINETIONS,
    },
    {
      provide: TOKEN_CONSTANTS,
      useFactory: (env: Environments) =>
        createConstantsWithBaseDomain(env.LABEL_BASE_DOMAIN),
      deps: [ENVIRONMENTS],
    },
    {
      provide: TOKEN_CONSOLE_API_PREFIXES,
      useFactory: getAppBaseHref,
      deps: [PlatformLocation],
    },
    {
      provide: NAV_CONFIG_LOCAL_STORAGE_KEY,
      useValue: 'diablo-clone',
    },
  ],
})
export class ServicesModule {
  /* Make sure ServicesModule is imported only by one NgModule the RootModule */
  constructor(
    @Inject(ServicesModule)
    @Optional()
    @SkipSelf()
    parentModule: ServicesModule,
    monacoProvider: MonacoProviderService,
    iconRegistryService: IconRegistryService,
    // Inject the following to make sure they are loaded ahead of other components.
    _translate: TranslateService,
  ) {
    if (parentModule) {
      throw new Error(
        'ServicesModule is already loaded. Import only in AppModule.',
      );
    }

    monacoProvider.initMonaco();
    iconRegistryService.registrySvgSymbolsByUrl(basicIconsUrl);
    iconRegistryService.registrySvgSymbolsByUrl('icons/diablo-icons.svg');
    iconRegistryService.registrySvgSymbolsByUrl(
      'icons/microservice/microservice-icons.svg',
    );
  }
}
