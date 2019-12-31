import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  isAllowed,
  publishRef,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageApiService, StoragesFindParams } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { isEqual } from 'lodash-es';
import { Observable, Subject, combineLatest, interval } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageListPageComponent {
  refresh$ = new Subject<void>();

  params$ = combineLatest([
    this.route.parent.parent.paramMap,
    this.route.queryParamMap,
  ]).pipe(
    map(([params, queryParams]) => ({
      pageIndex: +(queryParams.get('page') || '1') - 1,
      itemsPerPage: +(queryParams.get('page_size') || '20'),
      cluster: params.get('cluster'),
      namespace: params.get('namespace'),
      name: queryParams.get('keywords') || '',
      sort: queryParams.get('sort') || 'creationTimestamp',
      direction: queryParams.get('direction') || 'desc',
    })),
    distinctUntilChanged(isEqual),
    publishReplay(1),
    refCount(),
  );

  keywords$: Observable<string> = this.params$.pipe(
    map(params => params.name),
    publishReplay(1),
    refCount(),
  );

  permissions$ = this.params$.pipe(
    switchMap(param => {
      return this.k8sPermission
        .getAccess({
          type: RESOURCE_TYPES.PERSISTENTVOLUMECLAIMS,
          cluster: param.cluster,
          action: [K8sResourceAction.CREATE, K8sResourceAction.DELETE],
          namespace: param.namespace,
        })
        .pipe(isAllowed());
    }),
    publishRef(),
  );

  private readonly dataFetcher = (params: StoragesFindParams) => {
    return combineLatest([this.fetchStorages(params), this.permissions$]).pipe(
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
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly storageApi: StorageApiService,
    private readonly k8sPermission: K8sPermissionService,
  ) {
    this.fetchStorages = this.fetchStorages.bind(this);
  }

  fetchStorages = (params: StoragesFindParams) =>
    interval(10000).pipe(
      startWith(0),
      switchMap(() => this.storageApi.getStorages(params)),
    );

  onSort({ sort, direction }: { sort: string; direction: string }) {
    this.router.navigate([], {
      queryParams: {
        sort,
        direction,
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  search(keywords: string) {
    this.router.navigate([], {
      queryParams: { keywords, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  createStorage() {
    this.router.navigate(['./', 'create'], {
      relativeTo: this.route,
    });
  }

  currentPageChange(page: number) {
    this.router.navigate([], {
      queryParams: {
        page,
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  pageSizeChange(pageSize: number) {
    this.router.navigate([], {
      queryParams: {
        page: 1,
        page_size: pageSize,
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }
}
