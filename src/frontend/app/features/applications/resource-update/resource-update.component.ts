import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApplicationApiService, ApplicationIdentity } from '@app/api';
import { isEqual } from 'lodash-es';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
} from 'rxjs/operators';

@Component({
  templateUrl: 'resource-update.component.html',
  styleUrls: ['resource-update.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceUpdateComponent {
  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      project: paramMap.get('project'),
      cluster: paramMap.get('cluster'),
      namespace: paramMap.get('namespace'),
      name: paramMap.get('name'),
      kind: paramMap.get('kind'),
      resourceName: paramMap.get('resourceName'),
    })),
    distinctUntilChanged(isEqual),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private route: ActivatedRoute,
    private api: ApplicationApiService,
  ) {}

  fetchResource = (identity: ApplicationIdentity) =>
    this.api.getK8sResource(
      {
        namespace: identity.namespace,
        resourceName: identity.resourceName,
        cluster: identity.cluster,
      },
      identity.kind,
    );
}
