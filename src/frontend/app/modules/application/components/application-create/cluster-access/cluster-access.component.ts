import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
} from '@angular/core';
import { ClusterAccess } from '@app/api';
import { getProtocol } from '@app/api/application/application-api.service';
import { BaseResourceFormArrayComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-cluster-access',
  templateUrl: './cluster-access.component.html',
  styleUrls: ['./cluster-access.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCreateClusterAccessComponent extends BaseResourceFormArrayComponent<
  ClusterAccess
> {
  @Input()
  isSingle = false;

  @Input()
  isUpdate = false;

  params: Array<{ value: string }> = [];
  get protocol() {
    return getProtocol();
  }

  constructor(injector: Injector) {
    super(injector);
  }

  createForm() {
    return this.fb.array([]);
  }

  getDefaultFormModel() {
    return [{ serviceName: '', protocol: 'TCP' }];
  }

  getOnFormArrayResizeFn() {
    return () => this.createNewControl();
  }

  private createNewControl() {
    return this.fb.group({
      serviceName: [],
      protocol: [],
      sourcePort: [],
      targetPort: [],
    });
  }
}
