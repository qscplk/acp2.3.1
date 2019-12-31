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
import { ConfigMapApiService, ConfigMapDetail } from '@app/api';

@Component({
  selector: 'alo-configmap-detail',
  templateUrl: './configmap-detail.component.html',
  styleUrls: ['./configmap-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigMapDetailComponent {
  @Input()
  params: { cluster: string; name: string; namespace: string };

  @Input()
  data: ConfigMapDetail;

  @Input()
  permissions: {
    update: boolean;
    delete: boolean;
  };

  @Output()
  updated = new EventEmitter();

  constructor(
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ConfigMapApiService,
  ) {}

  deleteConfigMap() {
    this.dialog
      .confirm({
        title: this.translate.get('configmap.configmap_delete_confirm', {
          name: this.params.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        beforeConfirm: (resolve, reject) => {
          this.api
            .deleteConfigMap(
              this.params.cluster,
              this.params.namespace,
              this.params.name,
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
        this.router.navigate(['../../'], {
          relativeTo: this.route,
        });
      })
      .catch(() => {});
  }
}
