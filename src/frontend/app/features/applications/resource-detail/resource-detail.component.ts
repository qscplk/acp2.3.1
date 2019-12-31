import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApplicationApiService, ApplicationIdentity } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { K8sResourceDetailComponent } from '@app/modules/application/components/k8s-resource-detail/k8s-resource-detail.component';
import { PermissionService } from '@app/services';
import { isEmpty, isEqual } from 'lodash-es';
import { of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'resource-detail.component.html',
  styleUrls: ['resource-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceDetailComponent {
  @ViewChild('detailRef', { static: false })
  detailComp: K8sResourceDetailComponent;
  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      project: paramMap.get('project'),
      namespace: paramMap.get('namespace'),
      cluster: paramMap.get('cluster'),
      name: paramMap.get('name'),
      kind: paramMap.get('kind'),
      resourceName: paramMap.get('resourceName'),
    })),
    distinctUntilChanged(isEqual),
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
    private route: ActivatedRoute,
    private api: ApplicationApiService,
    private permission: PermissionService,
  ) {}

  fetchResource = (identity: ApplicationIdentity) =>
    this.api.getK8sResource(
      {
        cluster: identity.cluster,
        namespace: identity.namespace,
        resourceName: identity.resourceName,
      },
      identity.kind,
    );

  isHorizontalPodAutoscalerListEmpty(resourceDetail: any) {
    return (
      resourceDetail && isEmpty(resourceDetail.data.horizontalPodAutoscalerList)
    );
  }

  rollback() {
    this.detailComp.rollback();
  }

  addAutoScaling() {
    this.detailComp.addAutoScaling();
  }

  updateAutoScaling() {
    this.detailComp.updateAutoScaling();
  }
}
