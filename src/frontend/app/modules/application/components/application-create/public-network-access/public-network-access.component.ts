import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
} from '@angular/core';
import { PublicNetworkAccess } from '@app/api';
import { BaseResourceFormArrayComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-public-network-access',
  templateUrl: './public-network-access.component.html',
  styleUrls: ['./public-network-access.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCreatePublicNetWorkAccessComponent extends BaseResourceFormArrayComponent<
  PublicNetworkAccess
> {
  @Input()
  isSingle = false;

  params: Array<{ value: string }> = [];

  constructor(injector: Injector) {
    super(injector);
  }

  createForm() {
    return this.fb.array([]);
  }

  getDefaultFormModel() {
    return [
      {
        domainPrefix: '',
        domainName: '',
        path: '',
      },
    ];
  }

  getOnFormArrayResizeFn() {
    return () => this.createNewControl();
  }

  private createNewControl() {
    return this.fb.group({
      domainPrefix: [],
      domainName: [],
      path: [],
      targetPort: [],
    });
  }
}
