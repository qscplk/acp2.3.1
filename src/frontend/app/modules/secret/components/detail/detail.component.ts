import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  Output,
} from '@angular/core';
import { Secret, SecretIdentity, SecretType } from '@app/api';

import { MODULE_ENV, ModuleEnv } from '../../module-env';
import { SecretActions } from '../../services/acitons';

@Component({
  selector: 'alo-secret-detail',
  templateUrl: 'detail.component.html',
  styleUrls: ['detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretDetailComponent {
  @Input()
  identity: SecretIdentity;

  @Input()
  data: Secret;

  @Input()
  permissions: {
    update: boolean;
    delete: boolean;
  };

  @Output()
  deleted = new EventEmitter<void>();

  @Output()
  refresh = new EventEmitter<void>();

  secretTypes = SecretType;

  constructor(
    private readonly secretActions: SecretActions,
    @Inject(MODULE_ENV) public env: ModuleEnv,
  ) {}

  updateDisplayName(item: Secret) {
    this.secretActions.updateDisplayName(item).subscribe(result => {
      if (result) {
        this.refresh.emit();
      }
    });
  }

  updateData(item: Secret) {
    this.secretActions.updateData(item).subscribe(result => {
      if (result) {
        this.refresh.emit();
      }
    });
  }

  delete(item: Secret) {
    this.secretActions.delete(item).subscribe(result => {
      if (result) {
        this.deleted.emit();
      }
    });
  }

  getItemIcon(item: Secret) {
    if (!item) {
      return '';
    }

    return `icons/${item.private ? 'secret-private.svg' : 'secret-public.svg'}`;
  }

  toPairs(data: { [name: string]: any }) {
    return Object.keys(data || {}).map(key => ({ key, value: data[key] }));
  }
}
