import {
  COMMON_WRITABLE_ACTIONS,
  K8sPermissionService,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigSecretApiService, ConfigSecretsFindParams } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { isEqual } from 'lodash-es';
import { Subject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretListPageComponent {
  params$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
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

  keywords$ = this.params$.pipe(
    map(params => params.name),
    publishReplay(1),
    refCount(),
  );

  pageIndex$ = this.params$.pipe(
    map(params => params.pageIndex),
    publishReplay(1),
    refCount(),
  );

  itemsPerpage$ = this.params$.pipe(
    map(params => params.itemsPerPage),
    publishReplay(1),
    refCount(),
  );

  permissions$ = this.params$.pipe(
    switchMap(params =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.SECRETS,
        cluster: params.cluster,
        namespace: params.namespace,
        action: COMMON_WRITABLE_ACTIONS,
      }),
    ),
  );

  refresh$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly secretApi: ConfigSecretApiService,
    private readonly k8sPermission: K8sPermissionService,
  ) {}

  fetchSecrets = (params: ConfigSecretsFindParams) => {
    const { cluster, namespace } = params;
    return this.secretApi.getSecrets({ cluster, namespace }, params);
  };

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

  createSecret() {
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
