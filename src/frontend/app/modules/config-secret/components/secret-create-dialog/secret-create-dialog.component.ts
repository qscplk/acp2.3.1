import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ConfigSecretApiService, SecretType } from '@app/api';

@Component({
  templateUrl: 'secret-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretCreateDialogComponent {
  displayModel = 'form';
  displayName = '';
  submitting = false;
  formModel: any = {
    type: SecretType.DockerConfig,
  };

  get submitDisabled() {
    return this.submitting;
  }

  @ViewChild(NgForm, { static: true })
  form: NgForm;

  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      cluster: string;
      namespace: string;
      types: SecretType[];
    },
    private readonly dialogRef: DialogRef<ConfigSecretCreateDialogComponent>,
    private readonly cdr: ChangeDetectorRef,
    private readonly secretApi: ConfigSecretApiService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
  ) {}

  create() {
    this.form.onSubmit(null);
    this.submitting = true;
    this.cdr.markForCheck();

    this.secretApi
      .createSecret(
        this.data.cluster,
        this.data.namespace,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        res => {
          this.dialogRef.close(res);
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
