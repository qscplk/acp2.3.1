import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
} from '@angular/core';
import { BaseResourceMutatePageComponent } from '@app/abstract';
import { ConfigSecretApiService } from '@app/api';

@Component({
  selector: 'alo-secret-create',
  templateUrl: './secret-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretCreateComponent extends BaseResourceMutatePageComponent<
  any
> {
  @Input()
  displayModel = 'form';

  @Output()
  created = new EventEmitter<string>();

  cluster = this.activatedRoute.snapshot.params.cluster;
  namespace = this.activatedRoute.snapshot.params.namespace;
  displayName = '';
  get kind() {
    return 'Secret';
  }

  constructor(
    injector: Injector,
    private readonly secretApi: ConfigSecretApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
  ) {
    super(injector);
  }

  create() {
    this.form.onSubmit(null);
    if (this.mode === 'yaml') {
      this.formModel = this.yamlToForm(this.yaml);
    }

    this.submitting = true;
    this.cdr.markForCheck();

    this.secretApi
      .createSecret(
        this.cluster,
        this.namespace,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        res => {
          this.message.success({
            content: this.translate.get('configsecret.secret_create_succ'),
          });
          this.router.navigate(['../detail', res.objectMeta.name], {
            relativeTo: this.activatedRoute,
          });
        },
        (err: any) => {
          this.notifaction.error({
            title: this.translate.get('configsecret.secret_create_fail'),
            content: err.error.error || err.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
