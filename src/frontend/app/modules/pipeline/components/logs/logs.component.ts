import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
} from '@angular/core';
import {
  PipelineApiService,
  PipelineHistory,
  PipelineHistoryLog,
} from '@app/api';
import { get } from 'lodash-es';
import { catchError, map, tap } from 'rxjs/operators';

@Component({
  templateUrl: 'logs.component.html',
  styleUrls: ['logs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsComponent {
  editorOptions = { language: 'Logs', readOnly: true };
  logs = '';
  next = 0;
  more = true;
  errorCount = 0;
  text = '';
  running = true;

  constructor(
    private readonly notification: NotificationService,
    private readonly pipelineApi: PipelineApiService,
    private readonly dialogRef: DialogRef<LogsComponent>,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(DIALOG_DATA) public data: PipelineHistory,
  ) {}

  fetchData = () =>
    this.pipelineApi
      .getPipelineHistory(this.data.namespace, this.data.name, {
        withFreshStages: true,
      })
      .pipe(
        map(res => res),
        tap((history: PipelineHistory) => {
          const currentStatus = get(history, 'status.phase', '');
          this.running = ['Queued', 'Pending', 'Running'].includes(
            currentStatus,
          );
          this.cdr.detectChanges();
        }),
        catchError((err: any) => {
          this.running = false;
          this.cdr.detectChanges();
          if (err.status === 403) {
            this.notification.error({
              title: this.translate.get('errorType'),
              content: err.error.error || err.error.message,
            });
          }
          throw err;
        }),
      );

  fetchLogs = () => {
    return this.pipelineApi
      .getPipelineHistoryLog(this.data.namespace, this.data.name, {
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
            this.notification.error({
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
