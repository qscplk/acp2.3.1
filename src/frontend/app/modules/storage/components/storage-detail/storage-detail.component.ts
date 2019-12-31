import { TranslateService } from '@alauda/common-snippet';
import { DialogService, MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { StorageApiService, StorageDetail } from '@app/api';

@Component({
  selector: 'alo-storage-detail',
  templateUrl: './storage-detail.component.html',
  styleUrls: ['./storage-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageDetailComponent {
  @Input()
  params: { cluster: string; name: string; namespace: string };
  @Input()
  data: StorageDetail;
  @Input()
  allowedUpdate: boolean;
  @Output()
  updated = new EventEmitter();
  @Output()
  deleted = new EventEmitter();
  constructor(
    private dialog: DialogService,
    private message: MessageService,
    private notifaction: NotificationService,
    private translate: TranslateService,
    private api: StorageApiService,
  ) {}

  getAccessModesDisplayname(AccessModes: string[]) {
    if (!AccessModes) {
      return '-';
    }
    switch (AccessModes[0]) {
      case 'ReadWriteOnce':
        return this.translate.get('storage.ReadWriteOnce');
      case 'ReadOnlyMany':
        return this.translate.get('storage.ReadOnlyMany');
      case 'ReadWriteMany':
        return this.translate.get('storage.ReadWriteMany');
      default:
        return '-';
    }
  }

  deleteStorage() {
    this.dialog
      .confirm({
        title: this.translate.get('storage.storage_delete_confirm', {
          name: this.params.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        beforeConfirm: (resolve, reject) => {
          this.api
            .deleteStorage(
              this.params.cluster,
              this.params.namespace,
              this.params.name,
            )
            .subscribe(
              () => {
                this.message.success({
                  content: this.translate.get('storage.storage_delete_succ'),
                });
                resolve();
              },
              (err: any) => {
                this.notifaction.error({
                  title: this.translate.get('storage.storage_delete_fail'),
                  content: err.error.error || err.error.message,
                });
                reject();
              },
            );
        },
      })
      .then(() => {
        this.deleted.emit();
      })
      .catch(() => {});
  }
}
