import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  PipelineApiService,
  PipelineHistoryLog,
  PipelineHistoryStep,
  PipelineStepInputBody,
  TriggerPipelineParametersModel,
} from '@app/api';
import { get } from 'lodash-es';
import { Subject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-history-step',
  templateUrl: './history-step.component.html',
  styleUrls: ['./history-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryStepComponent implements OnChanges {
  more = false;
  errorCount = 0;
  next = 0;
  active = false;
  text: string[] = [];
  showStepInput = false;
  @Input()
  step: PipelineHistoryStep;

  @Input()
  project: string;

  @Input()
  historyName: string;

  @Input()
  stageId: string;

  @Input()
  permissions: {
    pipelinesInput: {
      create: boolean;
    };
  };

  @Output()
  stageStatusChanged = new EventEmitter<any>();

  refresh$ = new Subject<void>();

  params$ = new Subject<boolean>();
  constructor(
    private readonly api: PipelineApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notification: NotificationService,
  ) {}

  ngOnChanges({ step }: SimpleChanges) {
    this.showStepInput = !!get(step, ['currentValue', 'input']);
  }

  stepLogs(step: PipelineHistoryStep) {
    this.params$.next(!this.active);
    if (this.canUnfoldLog(step)) {
      this.active = !this.active;
    }
  }

  canUnfoldLog(step: PipelineHistoryStep) {
    return step.actions && step.actions.length;
  }

  fetchData = (params: boolean) => {
    if (!params) {
      return of(null);
    }
    return this.api
      .getPipelineHistoryStepLog(this.project, this.historyName, {
        start: this.next,
        stage: this.stageId,
        step: this.step.id,
      })
      .pipe(
        tap((res: PipelineHistoryLog) => {
          this.next = res.nextStart;
          this.more = res.more;
          if (res.text) {
            this.text = this.text.concat(res.text.split('\n'));
          }
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

  getStatusIcon() {
    switch (
      this.step.result !== 'UNKNOWN' ? this.step.result : this.step.state
    ) {
      case 'SUCCESS':
        return 'basic:success_s';
      case 'RUNNING':
        return 'basic:sync';
      case 'FAILURE':
        return 'basic:fail_s';
      case 'ABORTED':
        return 'basic:stop_s';
      case 'PAUSED':
        return 'basic:exclamation';
      default:
        return 'check_s';
    }
  }

  getParameters() {
    return get(this.step, ['input', 'parameters'], []);
  }

  trackLogs(index: number) {
    return index;
  }

  onTriggered({
    approve,
    inputID,
    parameters,
  }: TriggerPipelineParametersModel) {
    const body = {
      approve,
      inputID,
      parameters,
      stage: parseInt(this.stageId, 10),
      step: parseInt(this.step.id, 10),
    };
    this.triggerPipelineHistoryInput(body);
  }

  triggerPipelineHistoryInput(body: PipelineStepInputBody) {
    this.api
      .triggerPipelineHistoryInput(this.project, this.historyName, body)
      .subscribe(() => {
        this.refresh$.next();
        this.stageStatusChanged.emit();
      });
  }
}
