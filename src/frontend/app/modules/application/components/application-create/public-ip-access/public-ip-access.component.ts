import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { PublicIPAccess } from '@app/api';
import { getProtocol } from '@app/api/application/application-api.service';
import { BaseResourceFormArrayComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-public-ip-access',
  templateUrl: './public-ip-access.component.html',
  styleUrls: ['./public-ip-access.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCreatePublicIPAccessComponent extends BaseResourceFormArrayComponent<
  PublicIPAccess
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
    return [{ protocol: 'TCP' }];
  }

  getOnFormArrayResizeFn() {
    return () => this.createNewControl();
  }

  private createNewControl() {
    return this.fb.group({
      protocol: [],
      nodePort: this.fb.control('', [
        Validators.min(30000),
        Validators.max(32767),
        Validators.pattern(/^\+?[1-9][0-9]*$/),
      ]),
      sourcePort: [],
    });
  }
}
