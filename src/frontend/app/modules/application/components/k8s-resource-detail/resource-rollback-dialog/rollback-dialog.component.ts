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
} from '@angular/core';
import { ApplicationApiService, ApplicationIdentity } from '@app/api';

@Component({
  templateUrl: './rollback-dialog.component.html',
  styleUrls: ['./rollback-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollbackDialogComponent {
  selectedRevision: string;
  submitting = false;
  constructor(
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly api: ApplicationApiService,
    private readonly dialogRef: DialogRef<RollbackDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      params: ApplicationIdentity;
      total: number;
      items: Array<{
        creationTimestamp: string;
        revision: string;
        tags: string[];
      }>;
    },
  ) {}

  rollback() {
    this.submitting = true;
    this.api
      .rollback(
        this.data.params.cluster,
        this.data.params.namespace,
        this.data.params.resourceName,
        parseInt(this.selectedRevision, 10),
      )
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('application.rollback_success', {
              name: this.data.params.name,
            }),
          });
          this.dialogRef.close(true);
        },
        (error: any) => {
          this.submitting = false;
          this.cdr.markForCheck();
          this.notifaction.error({
            title: this.translate.get('application.rollback_failed', {
              name: this.data.params.name,
            }),
            content: error.error.error || error.error.message,
          });
        },
      );
  }
}
