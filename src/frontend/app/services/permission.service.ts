import {
  K8sPermissionService,
  K8sResourceAction,
} from '@alauda/common-snippet';
import { Injectable } from '@angular/core';
import { ResourceType } from '@app/constants';
import debug from 'debug';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

const log = debug('permission:cani');

@Injectable()
export class PermissionService {
  constructor(private readonly k8sPermission: K8sPermissionService) {}

  canI(
    action: string,
    namespace: string,
    type: ResourceType,
    name = '',
    cluster = '',
  ): Observable<boolean> {
    log('params', {
      action,
      namespace,
      type,
      name,
      cluster,
    });
    return this.k8sPermission
      .isAllowed({
        type,
        name,
        action: action as K8sResourceAction,
        namespace,
        cluster,
      })
      .pipe(
        map(res => res),
        tap(log.bind(null, 'result')),
      );
  }
}
