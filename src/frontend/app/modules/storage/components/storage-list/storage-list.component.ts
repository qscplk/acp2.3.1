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
import { StorageApiService, StorageItem, StoragesFindParams } from '@app/api';

const defaultData = (): { items: StorageItem[]; length: number } => ({
  items: [],
  length: 0,
});

@Component({
  selector: 'alo-storage-list',
  templateUrl: 'storage-list.component.html',
  styleUrls: ['storage-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageListComponent {
  @Input()
  params: StoragesFindParams;
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
    delete: boolean;
  };

  @Output()
  sortChange = new EventEmitter<{
    sort: string;
    direction: string;
  }>();
  @Output()
  updated = new EventEmitter();

  columns = ['name', 'status', 'size', 'creationTimestamp', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: DialogService,
    private message: MessageService,
    private notifaction: NotificationService,
    private translate: TranslateService,
    private storageApi: StorageApiService,
  ) {}

  tracker(_: number, item: StorageItem) {
    return item.objectMeta.name;
  }

  onSort({ active, direction }: { active: string; direction: string }) {
    this.sortChange.emit({
      sort: active,
      direction,
    });
  }

  update(storage: StorageItem) {
    this.router.navigate(['./update', storage.objectMeta.name], {
      relativeTo: this.route,
    });
  }

  delete(storage: StorageItem) {
    this.dialog
      .confirm({
        title: this.translate.get('storage.storage_delete_confirm', {
          name: storage.objectMeta.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        beforeConfirm: (resolve, reject) => {
          this.storageApi
            .deleteStorage(
              this.params.cluster,
              this.params.namespace,
              storage.objectMeta.name,
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
        this.updated.emit();
      })
      .catch(() => {});
  }

  refreshList(data: any) {
    if (data) {
      this.updated.emit();
    }
  }
}
