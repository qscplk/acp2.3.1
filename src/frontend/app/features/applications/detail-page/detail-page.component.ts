import { AsyncDataLoader } from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationApiService, ApplicationIdentity } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { ApplicationDetailComponent } from '@app/modules/application/components/detail/detail.component';
import { PermissionService } from '@app/services';
import { isEmpty } from 'lodash-es';
import { interval, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'detail-page.component.html',
  styleUrls: ['detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDetailPageComponent {
  @ViewChild('detailRef', { static: false })
  detailComp: ApplicationDetailComponent;

  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      project: paramMap.get('project'),
      namespace: paramMap.get('namespace'),
      name: paramMap.get('name'),
      cluster: paramMap.get('cluster'),
    })),
    publishReplay(1),
    refCount(),
  );

  allowedUpdate$ = this.identity$.pipe(
    switchMap(params =>
      this.permission
        .canI(
          'update',
          params.namespace,
          RESOURCE_TYPES.APPLICATIONS,
          '',
          params.cluster,
        )
        .pipe(
          catchError(() => of(false)),
          startWith(false),
        ),
    ),
    publishReplay(1),
    refCount(),
  );

  allowedDelete$ = this.identity$.pipe(
    switchMap(params =>
      this.permission
        .canI(
          'delete',
          params.namespace,
          RESOURCE_TYPES.APPLICATIONS,
          '',
          params.cluster,
        )
        .pipe(
          catchError(() => of(false)),
          startWith(false),
        ),
    ),
    publishReplay(1),
    refCount(),
  );

  allowedStart$ = this.identity$.pipe(
    switchMap(params =>
      this.permission
        .canI(
          'start',
          params.namespace,
          RESOURCE_TYPES.APPLICATIONS,
          '',
          params.cluster,
        )
        .pipe(
          catchError(() => of(false)),
          startWith(false),
        ),
    ),
    publishReplay(1),
    refCount(),
  );

  allowedStop$ = this.identity$.pipe(
    switchMap(params =>
      this.permission
        .canI(
          'start',
          params.namespace,
          RESOURCE_TYPES.APPLICATIONS,
          '',
          params.cluster,
        )
        .pipe(
          catchError(() => of(false)),
          startWith(false),
        ),
    ),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApplicationApiService,
    private readonly permission: PermissionService,
  ) {}

  fetchApplication = (identity: ApplicationIdentity) => this.api.get(identity);

  dataLoader = new AsyncDataLoader({
    params$: this.identity$,
    fetcher: (identity: ApplicationIdentity) =>
      interval(10 * 1000).pipe(
        startWith(0),
        switchMap(() => this.fetchApplication(identity)),
      ),
  });

  isEmpty(arr: any[]) {
    return isEmpty(arr);
  }

  onDeleted() {
    this.router.navigate(['../'], {
      relativeTo: this.route,
    });
  }

  updateByYaml() {
    this.detailComp.updateByYaml();
  }

  confirmDelete() {
    this.detailComp.confirmDelete();
  }

  refresh() {
    this.dataLoader.reload();
  }
}
