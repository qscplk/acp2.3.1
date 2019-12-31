import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
  isAllowed,
} from '@alauda/common-snippet';
import { NotificationService } from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SecretApiService, SecretIdentity } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { MODULE_ENV, ModuleEnv } from '@app/modules/secret';
import { Observable, combineLatest } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'detail-page.component.html',
  styleUrls: ['detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretDetailPageComponent {
  id$: Observable<SecretIdentity> = this.route.paramMap.pipe(
    map(paramMap => ({
      name: paramMap.get('name'),
      namespace: paramMap.get('project'),
    })),
    publishReplay(1),
    refCount(),
  );

  permissions$ = this.id$.pipe(
    switchMap((id: SecretIdentity) =>
      this.k8sPermission.getAccess({
        type: RESOURCE_TYPES.SECRETS,
        namespace: id.namespace,
        action: [K8sResourceAction.DELETE, K8sResourceAction.UPDATE],
      }),
    ),
    isAllowed(),
  );

  private readonly dataFetcher = (params: SecretIdentity) => {
    return combineLatest([this.fetchSecret(params), this.permissions$]).pipe(
      map(([data, permissions]) => ({
        data,
        permissions,
      })),
    );
  };

  dataManager = new AsyncDataLoader({
    params$: this.id$,
    fetcher: this.dataFetcher,
  });

  fetchSecret = (identity: SecretIdentity) =>
    this.secretApi.get(identity).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.notification.warning({
            title: this.translate.get('forbidden'),
            content: error.error.error || error.error.message,
          });
        }

        throw error;
      }),
    );

  parentRoute = this.env === 'admin' ? ['../../'] : ['../'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly secretApi: SecretApiService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly k8sPermission: K8sPermissionService,
    @Inject(MODULE_ENV) private readonly env: ModuleEnv,
  ) {}

  onDeleted() {
    this.back();
  }

  back() {
    this.router.navigate(this.parentRoute, {
      relativeTo: this.route,
    });
  }
}
