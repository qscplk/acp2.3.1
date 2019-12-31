import {
  AsyncDataLoader,
  COMMON_WRITABLE_ACTIONS,
  K8sPermissionService,
  isAllowed,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfigMapApiService } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { ConfigMapDetailComponent } from '@app/modules/configmap/components/configmap-detail/configmap-detail.component';
import { combineLatest } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: 'detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigMapDetailPageComponent {
  @ViewChild('detailRef', { static: false })
  detailComp: ConfigMapDetailComponent;

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
    return combineLatest([this.fetchConfigmap(params), this.permissions$]).pipe(
      map(([configmapDetail, permissions]) => ({
        configmapDetail,
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
        type: RESOURCE_TYPES.CONFIGMAPS,
        cluster: baseParams.cluster,
        namespace: baseParams.namespace,
        action: COMMON_WRITABLE_ACTIONS,
      }),
    ),
    isAllowed(),
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ConfigMapApiService,
    private readonly k8sPermission: K8sPermissionService,
  ) {}

  fetchConfigmap = (params: {
    cluster: string;
    name: string;
    namespace: string;
  }) => this.api.getConfigMap(params.cluster, params.namespace, params.name);

  onDelete() {
    this.detailComp.deleteConfigMap();
  }
}
