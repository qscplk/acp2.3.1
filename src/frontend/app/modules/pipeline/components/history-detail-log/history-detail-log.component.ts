import { Stage } from '@alauda/common-snippet';
import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChange,
} from '@angular/core';
import {
  PipelineApiService,
  PipelineHistory,
  PipelineHistoryLog,
  PipelineHistoryStep,
} from '@app/api';
import { find, get } from 'lodash-es';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-history-detail-log',
  templateUrl: './history-detail-log.component.html',
  styleUrls: ['./history-detail-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryDetailLogComponent implements OnChanges {
  steps: any[];
  fullLog = true;
  selectedStageId: string;
  stageUserSelected: boolean = false;

  next = 0;
  more = true;
  errorCount = 0;
  text = '';

  @Input()
  history: PipelineHistory;
  @Input()
  project: string;
  @Input()
  permissions: {
    pipelinesInput: {
      create: boolean;
    };
  };

  @Output()
  stageStatusChanged = new EventEmitter<any>();

  get stages() {
    return get(this.history, 'jenkins.stages', []);
  }

  get selectedStage() {
    if (!this.selectedStageId) {
      return null;
    }
    return this.stages.find(
      (stage: Stage) => stage.id === this.selectedStageId,
    );
  }

  constructor(
    private api: PipelineApiService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
  ) {}

  // auto select: default to select stages, paused > running > fail > first
  autoSelectedStage(currentStages: Stage[]) {
    const selectableStages = currentStages.filter((item: Stage) => {
      const edges = get(item, 'edges', []);
      return !(edges.length >= 1 && edges[0].type === 'PARALLEL');
    });

    const firstStage = get(selectableStages, '[0]');

    const autoSelectedStage = (find(currentStages, {
      status: 'PAUSED',
    }) ||
      find(currentStages, {
        status: 'RUNNING',
      }) ||
      find(currentStages, {
        status: 'FINISHED',
        result: 'FAILURE',
      }) ||
      firstStage) as Stage;
    return {
      selectableStages,
      autoSelectedStage,
    };
  }

  ngOnChanges({ history }: { history: SimpleChange }) {
    const { selectableStages, autoSelectedStage } = this.autoSelectedStage(
      this.stages,
    );

    const autoSelectedStageId = get(autoSelectedStage, 'id');

    // 用户选择的 stage id 在执行过程中可能因为stage变化而失效 此时需要按照默认顺序选中
    const isUserSelectedIdValid =
      this.stageUserSelected &&
      selectableStages.some((stage: Stage) => {
        return stage.id === this.selectedStageId;
      });

    if (!isUserSelectedIdValid) {
      this.selectedStageId = autoSelectedStageId;
      this.stageUserSelected = false;
    }
    if (
      !this.stageUserSelected &&
      this.selectedStageId !== autoSelectedStageId
    ) {
      this.selectedStageId = autoSelectedStageId;
    }

    // refresh steps when history is refreshed
    if (history && history.currentValue && this.selectedStage) {
      this.getSteps();
    }
  }

  selectedChange(event: Stage) {
    if (this.fullLog) {
      return;
    }
    this.stageUserSelected = true;
    this.selectedStageId = event.id;
    this.getSteps();
  }

  getSteps() {
    this.api
      .getPipelineHistorySteps(
        this.project,
        this.history.name,
        this.selectedStage.id,
      )
      .subscribe(res => {
        this.steps = res.tasks;
        this.cdr.detectChanges();
      });
  }

  fetchLogs = () => {
    if (!this.history) {
      return of('');
    }
    if (!this.more) {
      this.next = 0;
      this.text = '';
    }
    return this.api
      .getPipelineHistoryLog(this.project, this.history.name, {
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

  onStageStatusChanged() {
    this.stageStatusChanged.emit();
  }

  disableFullLogSwitch(history: PipelineHistory) {
    return !get(history, 'jenkins.stages.length');
  }

  trackById(_: number, item: PipelineHistoryStep) {
    return item.id;
  }
}
