import {
  COMMON_WRITABLE_ACTIONS,
  K8sPermissionService,
  isAllowed,
  publishRef,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Secret } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { MODULE_ENV, ModuleEnv, QueryParams } from '@app/modules/secret';
import { toInteger } from 'lodash-es';
import { of } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretListPageComponent {
  project$ = this.getProject();
  params$ = this.getParams();

  itemRoute = this.getItemRoute();

  permissions$ = this.project$.pipe(
    switchMap((project?: string) => {
      return this.k8sPermission
        .getAccess({
          type: RESOURCE_TYPES.SECRETS,
          action: COMMON_WRITABLE_ACTIONS,
          namespace: project,
        })
        .pipe(isAllowed());
    }),
    publishRef(),
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly k8sPermission: K8sPermissionService,
    @Inject(MODULE_ENV) private readonly env: ModuleEnv,
  ) {}

  onParamsChange(params: Partial<QueryParams>) {
    this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      relativeTo: this.route,
    });
  }

  private getProject() {
    if (this.env === 'admin') {
      return of(null);
    }

    return this.route.paramMap.pipe(
      map(paramMap => paramMap.get('project')),
      publishReplay(1),
      refCount(),
    );
  }

  private getParams() {
    return this.route.queryParamMap.pipe(
      map(paramMap => {
        return {
          search_by: paramMap.get('search_by') || 'name',
          keywords: paramMap.get('keywords') || '',
          page: toInteger(paramMap.get('page')),
          page_size: toInteger(paramMap.get('page_size')),
          sort: paramMap.get('sort') || 'name',
          direction: paramMap.get('direction') || 'asc',
        };
      }),
      publishReplay(1),
      refCount(),
    );
  }

  private getItemRoute() {
    return this.env === 'admin'
      ? (item: Secret) => [item.namespace, item.name]
      : (item: Secret) => [item.name];
  }
}
