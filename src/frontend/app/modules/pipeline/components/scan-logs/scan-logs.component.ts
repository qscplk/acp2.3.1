import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
} from '@angular/core';
import {
  PipelineApiService,
  PipelineConfig,
  PipelineHistoryLog,
} from '@app/api';
import { catchError, tap } from 'rxjs/operators';

@Component({
  templateUrl: 'scan-logs.component.html',
  styleUrls: ['scan-logs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanLogsComponent {
  editorOptions = { language: 'Logs', readOnly: true };
  logs = '';
  next = 0;
  more = true;
  errorCount = 0;
  text = '';

  constructor(
    private readonly notifaction: NotificationService,
    private readonly pipelineApi: PipelineApiService,
    private readonly dialogRef: DialogRef<ScanLogsComponent>,
    private readonly cdr: ChangeDetectorRef,
    @Inject(DIALOG_DATA) public config: PipelineConfig,
  ) {}

  fetchLogs = () => {
    return this.pipelineApi
      .scanLogs(this.config.namespace, this.config.name, {
        start: this.next,
      })
      .pipe(
        tap((res: PipelineHistoryLog) => {
          this.next = res.nextStart;
          this.more = res.more;
          this.text = this.text + res.text;
          this.cdr.detectChanges();
        }),
        catchError(error => {
          if (this.errorCount > 5) {
            this.notifaction.error({
              content: error.error.error || error.error.message,
            });
            this.more = false;
            this.cdr.detectChanges();
          }
          this.errorCount++;
          throw error;
        }),
      );
  };

  cancel() {
    this.dialogRef.close();
  }
}
