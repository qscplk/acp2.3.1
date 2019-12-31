import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { SecretApiService, SecretType } from '@app/api';

@Component({
  templateUrl: 'update-data-dialog.component.html',
  styleUrls: ['./update-data-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretUpdateDataDialogComponent implements OnInit {
  saving = false;

  loading = false;

  model = this.secretApi.default();

  @ViewChild('form', { static: true })
  form: NgForm;

  secretTypes = SecretType;

  constructor(
    private readonly secretApi: SecretApiService,
    @Inject(DIALOG_DATA) public data: { namespace: string; name: string },
    private readonly dialogRef: DialogRef<SecretUpdateDataDialogComponent>,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loading = true;
    this.secretApi.get(this.data).subscribe(
      result => {
        this.model = result;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error => {
        this.notification.warning({
          title: this.translate.get('secret.edit_load_fail'),
          content: error.error.error || error.error.message,
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
    );
  }

  save() {
    (this.form as any).submitted = true;
    this.form.ngSubmit.emit();
  }

  onSubmit() {
    if (!this.form.valid) {
      return;
    }

    this.saving = true;
    this.secretApi.putData(this.model).subscribe(
      () => {
        this.message.success({
          content: this.translate.get('secret.update_succ'),
        });
        this.dialogRef.close(true);
      },
      error => {
        this.notification.error({
          title: this.translate.get('secret.update_fail'),
          content: error.error.error || error.error.message,
        });
        this.saving = false;
        this.cdr.markForCheck();
      },
    );
  }

  close(updated = false) {
    this.dialogRef.close(updated);
  }
}
