import { TranslateService } from '@alauda/common-snippet';
import { DialogService, MessageService, NotificationService } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigSecretApiService, ConfigSecretDetail } from '@app/api';

@Component({
  selector: 'alo-configsecret-detail',
  templateUrl: './secret-detail.component.html',
  styleUrls: ['./secret-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretDetailComponent {
  @Input()
  params: { cluster: string; name: string; namespace: string };

  @Input()
  data: ConfigSecretDetail;

  constructor(
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly secretApi: ConfigSecretApiService,
  ) {}

  deleteSecret() {
    this.dialog
      .confirm({
        title: this.translate.get('configsecret.secret_delete_confirm', {
          name: this.params.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        beforeConfirm: (resolve, reject) => {
          this.secretApi
            .deleteSecret(
              this.params.cluster,
              this.params.namespace,
              this.params.name,
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
        this.router.navigate(['../../'], {
          relativeTo: this.route,
        });
      })
      .catch(() => {});
  }

  getSecretTypeDisplayName(type: string) {
    return this.secretApi.getSecretTypeDisplayName(type);
  }

  getSecretIconType(type: string) {
    return this.secretApi.getSecretIconType(type);
  }
}
