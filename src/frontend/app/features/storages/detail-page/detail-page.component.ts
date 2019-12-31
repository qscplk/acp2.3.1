import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  isAllowed,
  publishRef,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageApiService } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { combineLatest, interval } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageDetailPageComponent {
  params$ = this.route.paramMap.pipe(
    map(paramMap => ({
      cluster: paramMap.get('cluster'),
      namespace: paramMap.get('namespace'),
      name: paramMap.get('name'),
    })),
    publishReplay(1),
    refCount(),
  );

  permissions$ = this.params$.pipe(
    switchMap(param => {
      return this.k8sPermission
        .getAccess({
          type: RESOURCE_TYPES.PERSISTENTVOLUMECLAIMS,
          cluster: param.cluster,
          action: [K8sResourceAction.UPDATE, K8sResourceAction.DELETE],
          namespace: param.namespace,
        })
        .pipe(isAllowed());
    }),
    publishRef(),
  );

  private dataFetcher = (identity: {
    cluster: string;
    name: string;
    namespace: string;
  }) => {
    return combineLatest([this.fetchStorage(identity), this.permissions$]).pipe(
      map(([resource, permissions]) => ({
        resource,
        permissions,
      })),
    );
  };

  dataManager = new AsyncDataLoader({
    params$: this.params$,
    fetcher: this.dataFetcher,
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: StorageApiService,
    private k8sPermission: K8sPermissionService,
  ) {}

  fetchStorage = (identity: {
    cluster: string;
    name: string;
    namespace: string;
  }) =>
    interval(10000).pipe(
      startWith(0),
      switchMap(() =>
        this.api.getStorage(
          identity.cluster,
          identity.namespace,
          identity.name,
        ),
      ),
    );

  onDeleted() {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
}
