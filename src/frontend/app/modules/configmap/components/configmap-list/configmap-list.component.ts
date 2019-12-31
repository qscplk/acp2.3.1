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
  ConfigMapApiService,
  ConfigMapFindParams,
  ConfigMapItem,
} from '@app/api';

const defaultData = (): { items: ConfigMapItem[]; length: number } => ({
  items: [],
  length: 0,
});

@Component({
  selector: 'alo-configmap-list',
  templateUrl: 'configmap-list.component.html',
  styleUrls: ['configmap-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigMapListComponent {
  @Input()
  params: ConfigMapFindParams;

  @Input()
  get data() {
    return this._data;
  }

  set data(value: { items: any[]; length: number }) {
    this._data = value || defaultData();
  }

  @Input()
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };

  private _data = defaultData();

  @Input()
  plainTable: boolean;

  @Output()
  sortChange = new EventEmitter<{
    sort: string;
    direction: string;
  }>();

  @Output()
  updated = new EventEmitter();

  columns = ['name', 'number', 'creationTimestamp', 'actions'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly configmapApi: ConfigMapApiService,
  ) {}

  tracker(_: number, item: ConfigMapItem) {
    return item.objectMeta.name;
  }

  onSort({ active, direction }: { active: string; direction: string }) {
    this.sortChange.emit({
      sort: active,
      direction,
    });
  }

  update(configmap: ConfigMapItem) {
    this.router.navigate(['./update', configmap.objectMeta.name], {
      relativeTo: this.route,
    });
  }

  delete(configmap: ConfigMapItem) {
    this.dialog
      .confirm({
        title: this.translate.get('configmap.configmap_delete_confirm', {
          name: configmap.objectMeta.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        beforeConfirm: (resolve, reject) => {
          this.configmapApi
            .deleteConfigMap(
              this.params.cluster,
              this.params.namespace,
              configmap.objectMeta.name,
            )
            .subscribe(
              () => {
                this.message.success({
                  content: this.translate.get(
                    'configmap.configmap_delete_succ',
                  ),
                });
                resolve();
              },
              (err: any) => {
                this.notifaction.error({
                  title: this.translate.get('configmap.configmap_delete_fail'),
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
