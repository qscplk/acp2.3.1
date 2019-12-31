import { MessageService, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { BaseResourceMutatePageComponent } from '@app/abstract';
import {
  ConfigSecretApiService,
  ConfigSecretDetail,
  ConfigSecretTypeMeta,
} from '@app/api';

@Component({
  selector: 'alo-secret-update',
  templateUrl: './secret-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretUpdateComponent extends BaseResourceMutatePageComponent<any>
  implements OnInit {
  @Input()
  displayModel = 'form';

  cluster = this.activatedRoute.snapshot.params.cluster;
  namespace = this.activatedRoute.snapshot.params.namespace;
  name = this.activatedRoute.snapshot.params.name;
  displayName = '';
  originalYaml: string;
  get kind() {
    return 'Secret';
  }

  constructor(
    injector: Injector,
    private readonly secretApi: ConfigSecretApiService,
    private readonly notifaction: NotificationService,
    private readonly message: MessageService,
    private readonly location: Location,
  ) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.secretApi.getSecret(this.cluster, this.namespace, this.name).subscribe(
      (secret: ConfigSecretDetail) => {
        this.displayName = secret.displayName || '';
        this.formModel = {
          apiVersion: ConfigSecretTypeMeta.apiVersion,
          data: secret.data,
          kind: secret.TypeMeta.kind,
          metadata: secret.metadata,
          type: secret.type,
        };
        this.originalYaml = this.formToYaml(this.formModel);
        this.cdr.markForCheck();
      },
      (err: any) => {
        this.notifaction.warning({
          title: this.translate.get('configsecret.secret_get_fail'),
          content: err.error.error || err.error.message,
        });
      },
    );
  }

  update() {
    this.form.onSubmit(null);
    if (this.mode === 'yaml') {
      this.formModel = this.yamlToForm(this.yaml);
    }

    this.submitting = true;
    this.cdr.markForCheck();

    this.secretApi
      .updateConfigSecret(
        this.cluster,
        this.namespace,
        this.name,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('configsecret.secret_update_succ'),
          });
          this.location.back();
        },
        (err: any) => {
          this.notifaction.error({
            title: this.translate.get('configsecret.secret_update_fail'),
            content: err.error.error || err.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
