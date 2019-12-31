import {
  K8sPermissionService,
  K8sResourceAction,
} from '@alauda/common-snippet';
import { Injectable } from '@angular/core';
import { RESOURCE_TYPES } from '@app/constants';
import { publishReplay, refCount } from 'rxjs/operators';

@Injectable()
export class RoleService {
  adminDoings$ = this.k8sPermission
    .isAllowed({
      type: RESOURCE_TYPES.VIEWS,
      name: 'devops-manageview',
      action: K8sResourceAction.GET,
    })
    .pipe(
      publishReplay(1),
      refCount(),
    );

  constructor(private k8sPermission: K8sPermissionService) {}
}
