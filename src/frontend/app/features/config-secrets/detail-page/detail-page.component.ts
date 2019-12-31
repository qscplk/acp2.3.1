import {
  AsyncDataLoader,
  COMMON_WRITABLE_ACTIONS,
  K8sPermissionService,
  isAllowed,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfigSecretApiService } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { ConfigSecretDetailComponent } from '@app/modules/config-secret/components/secret-detail/secret-detail.component';
import { combineLatest } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';
@Component({
  templateUrl: 'detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretDetailPageComponent {
  @ViewChild('detailRef', { static: false })
  detailComp: ConfigSecretDetailComponent;

  params$ = this.route.paramMap.pipe(
    map(paramMap => ({
      cluster: paramMap.get('cluster'),
      namespace: paramMap.get('namespace'),
      name: paramMap.get('name'),
    })),
    publishReplay(1),
    refCount(),
  );

  private readonly dataFetcher = (params: {
    cluster: string;
    name: string;
    namespace: string;
  }) => {
    return combineLatest([this.fetchSecret(params), this.permissions$]).pipe(
      map(([secretDetail, permissions]) => ({
        secretDetail,
        permissions,
      })),
    );
  };

  dataManager = new AsyncDataLoader({
    fetcher: this.dataFetcher,
    params$: this.params$,
  });

  permissions$ = this.params$.pipe(
    switchMap(baseParams =>
      this.k8sPermission.getAccess({
        type: RESOURCE_TYPES.SECRETS,
        cluster: baseParams.cluster,
        namespace: baseParams.namespace,
        action: COMMON_WRITABLE_ACTIONS,
      }),
    ),
    isAllowed(),
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ConfigSecretApiService,
    private readonly k8sPermission: K8sPermissionService,
  ) {}

  fetchSecret = (params: {
    cluster: string;
    name: string;
    namespace: string;
  }) => this.api.getSecret(params.cluster, params.namespace, params.name);

  onDelete() {
    this.detailComp.deleteSecret();
  }
}
