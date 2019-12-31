import { TranslateService } from '@alauda/common-snippet';
import { DialogService, MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ConfigSecretApiService,
  ConfigSecretsFindParams,
  ConfigSecretsItem,
} from '@app/api';

const defaultData = (): { items: any[]; length: number } => ({
  items: [],
  length: 0,
});

@Component({
  selector: 'alo-configsecret-list',
  templateUrl: 'secret-list.component.html',
  styleUrls: ['secret-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretListComponent {
  @Input()
  params: ConfigSecretsFindParams;

  @Input()
  get data() {
    return this._data;
  }

  set data(value: { items: any[]; length: number }) {
    this._data = value || defaultData();
  }

  private _data = defaultData();
  @Input()
  plainTable: boolean;

  @Input()
  permissions: {
    update: boolean;
    delete: boolean;
  };

  @Output()
  sortChange = new EventEmitter<{
    sort: string;
    direction: string;
  }>();

  @Output()
  updated = new EventEmitter();

  columns = ['name', 'type', 'creationTimestamp', 'actions'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly secretApi: ConfigSecretApiService,
  ) {}

  tracker(_: number, item: ConfigSecretsItem) {
    return item.objectMeta.name;
  }

  onSort({ active, direction }: { active: string; direction: string }) {
    this.sortChange.emit({
      sort: active,
      direction,
    });
  }

  update(secret: ConfigSecretsItem) {
    this.router.navigate(['./update', secret.objectMeta.name], {
      relativeTo: this.route,
    });
  }

  delete(secret: ConfigSecretsItem) {
    this.dialog
      .confirm({
        title: this.translate.get('configsecret.secret_delete_confirm', {
          name: secret.objectMeta.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        beforeConfirm: (resolve, reject) => {
          this.secretApi
            .deleteSecret(
              this.params.cluster,
              this.params.namespace,
              secret.objectMeta.name,
            )
            .subscribe(
              () => {
                this.message.success({
                  content: this.translate.get(
                    'configsecret.secret_delete_succ',
                  ),
                });
                resolve();
              },
              (err: any) => {
                this.notifaction.error({
                  title: this.translate.get('configsecret.secret_delete_fail'),
                  content: err.error.error || err.error.message,
                });
                reject();
              },
            );
        },
      })
      .then(() => {
        this.updated.emit();
      })
      .catch(() => {});
  }

  refreshList(data: any) {
    if (data) {
      this.updated.emit();
    }
  }

  getSecretTypeDisplayName(type: string) {
    return this.secretApi.getSecretTypeDisplayName(type);
  }

  getSecretIconType(type: string) {
    return this.secretApi.getSecretIconType(type);
  }
}
