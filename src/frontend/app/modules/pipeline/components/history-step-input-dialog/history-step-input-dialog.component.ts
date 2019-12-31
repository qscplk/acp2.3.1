import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogService,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  PipelineApiService,
  PipelineHistory,
  PipelineStepInputBody,
  PiplineTaskInput,
  PiplineTaskInputStatus,
  TriggerPipelineParametersModel,
} from '@app/api';
import { get } from 'lodash-es';
import { Subject, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: './history-step-input-dialog.component.html',
  styleUrls: ['./history-step-input-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryStepInputDialogComponent {
  stepId: string;
  taskInputStatus: PiplineTaskInputStatus;

  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      history: PipelineHistory;
      stage: PiplineTaskInput;
      project: string;
    },
    private readonly dialog: DialogService,
    private readonly api: PipelineApiService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
  ) {}

  refresh$ = new Subject<void>();

  identity$ = of(this.data.stage).pipe(
    map(stage => {
      return {
        historyName: this.data.history.name,
        stageId: stage.id,
      };
    }),
    distinctUntilChanged(),
    publishReplay(1),
    refCount(),
  );

  fetchData = (params: { historyName: string; stageId: string }) =>
    this.fetchStep(params.historyName, params.stageId).pipe(
      tap(res => {
        this.stepId = res.id;
      }),
      distinctUntilChanged(),
      publishReplay(1),
      refCount(),
    );

  onTriggered({
    approve,
    inputID,
    parameters,
  }: TriggerPipelineParametersModel) {
    const body = {
      approve,
      inputID,
      parameters,
      stage: parseInt(this.data.stage.id, 10),
      step: parseInt(this.stepId, 10),
    };
    this.triggerPipelineHistoryInput(body);
  }

  triggerPipelineHistoryInput(body: PipelineStepInputBody) {
    this.api
      .triggerPipelineHistoryInput(
        this.data.project,
        this.data.history.name,
        body,
      )
      .subscribe(
        () => {
          this.message.success({
            content: body.approve
              ? this.translate.get('pipeline.process_step_input_succeed')
              : this.translate.get('pipeline.terminate_step_input_succeed'),
          });
          this.dialog.closeAll();
        },
        error => {
          this.notification.error({
            title: body.approve
              ? this.translate.get('pipeline.process_step_input_failed')
              : this.translate.get('pipeline.terminate_step_input_failed'),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  fetchStep(name: string, id: string) {
    return this.api.getPipelineHistorySteps(this.data.project, name, id).pipe(
      map(res => {
        const tasks = get(res, 'tasks', []);
        const pausedTask = tasks.find(item => item.state === 'PAUSED');
        if (pausedTask) {
          this.taskInputStatus = PiplineTaskInputStatus.Paused;
          return pausedTask;
        } else {
          this.taskInputStatus = PiplineTaskInputStatus.Executed;
          return {};
        }
      }),
      catchError(() => {
        this.taskInputStatus = PiplineTaskInputStatus.Error;
        return of({});
      }),
    );
  }

  refresh() {
    this.refresh$.next();
  }

  close() {
    this.dialog.closeAll();
  }

  trackByFn(index: number) {
    return index;
  }
}
