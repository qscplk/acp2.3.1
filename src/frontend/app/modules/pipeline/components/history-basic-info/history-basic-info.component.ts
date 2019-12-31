import { TranslateService, noop } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  MessageService,
  NotificationService,
  TabSize,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PipelineApiService,
  PipelineHistory,
  ReportsApiService,
} from '@app/api';
import {
  getHistoryStatus,
  mapTriggerIcon,
  mapTriggerTranslateKey,
} from '@app/modules/pipeline/utils';
import { get } from 'lodash-es';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-history-basic-info',
  templateUrl: './history-basic-info.component.html',
  styleUrls: [
    './history-basic-info.component.scss',
    '../../shared-style/status.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryBasicInfoComponent implements OnChanges, OnDestroy {
  @Input()
  history: PipelineHistory;

  @Input()
  project: string;

  @Input()
  permissions: {
    pipelines: {
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    pipelinesInput: {
      create: boolean;
    };
  };

  @Input()
  reportCounts: {
    total: number;
    failed: number;
  };

  @Output()
  statusChange = new EventEmitter<string>();

  @Output()
  stageStatusChanged = new EventEmitter<any>();

  mapTriggerTranslateKey: Function = mapTriggerTranslateKey;
  mapTriggerIcon = mapTriggerIcon;

  tabs = {
    log: 0,
    report: 1,
  };

  activeTab = this.tabs.log;
  size = TabSize;

  destroy$ = new Subject<void>();

  constructor(
    private readonly auiDialog: DialogService,
    private readonly api: PipelineApiService,
    private readonly translate: TranslateService,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly reportsApi: ReportsApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges({ project, history }: SimpleChanges): void {
    if (project && project.currentValue && history && history.currentValue) {
      this.getTestReportCount({
        project: project.currentValue,
        name: history.currentValue.name,
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe(counts => {
          this.reportCounts = counts;
          this.cdr.markForCheck();
        }, noop);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  getTestReportCount({ project, name }: { project: string; name: string }) {
    return this.reportsApi
      .getPipelineTestReport({
        project,
        name,
        start: '0',
        limit: '0',
      })
      .pipe(
        map(reports => ({
          total: reports.SUMMARY.Total,
          failed: reports.SUMMARY.Failed + reports.SUMMARY.ExistingFailed,
        })),
      );
  }

  getHistoryStatusIcon(status: any, type: 'detail' | 'preview') {
    const phase =
      get(status, ['jenkins', 'status'], '') === 'PAUSED_PENDING_INPUT'
        ? 'Paused'
        : get(status, 'phase', '');
    return getHistoryStatus(phase, type);
  }

  getDuration(status: any) {
    if (!status || !status.finishedAt) {
      return 0;
    }
    return (
      new Date(status.finishedAt).getTime() -
      new Date(status.startedAt).getTime()
    );
  }

  delete() {
    this.auiDialog
      .confirm({
        title: this.translate.get('pipeline.delete_history_confirm', {
          name: this.history.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('delete'),
        confirmType: ConfirmType.Primary,
        beforeConfirm: (resolve, reject) => {
          this.api.deletePipeline(this.project, this.history.name).subscribe(
            () => {
              this.successNotification('history_delete_succ');
              resolve();
            },
            (err: any) => {
              this.errorMessage(err, 'history_delete_fail');
              reject();
            },
          );
        },
      })
      .then(() => {
        this.router.navigate(['../'], { relativeTo: this.route });
      })
      .catch(() => {
        this.auiDialog.closeAll();
      });
  }

  replay() {
    this.api.retryPipeline(this.project, this.history.name).subscribe(
      (result: PipelineHistory) => {
        this.successNotification('history_replay_succ');
        this.statusChange.emit(result.pipeline);
      },
      (err: any) => {
        this.errorMessage(err, 'history_replay_fail');
      },
    );
  }

  cancel() {
    this.auiDialog
      .confirm({
        title: this.translate.get('pipeline.cancel_history_confirm', {
          name: this.history.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('pipeline.cancel'),
        confirmType: ConfirmType.Primary,
        beforeConfirm: (resolve, reject) => {
          this.api.abortPipeline(this.project, this.history.name).subscribe(
            () => {
              this.successNotification('history_cancel_succ');
              resolve();
            },
            (err: any) => {
              this.errorMessage(err, 'history_cancel_fail');
              reject();
            },
          );
        },
      })
      .then(() => {
        this.statusChange.emit(this.history.pipeline);
      })
      .catch(() => {
        this.auiDialog.closeAll();
      });
  }

  private errorMessage(err: any, translationKey: string) {
    this.notification.error({
      title: this.translate.get(`pipeline.${translationKey}`, {
        name: this.history.name,
      }),
      content: err.error.error || err.error.message,
    });
  }

  private successNotification(translationKey: string) {
    this.message.success({
      content: this.translate.get(`pipeline.${translationKey}`, {
        name: this.history.name,
      }),
    });
  }

  onStageStatusChanged() {
    this.stageStatusChanged.emit();
  }

  sonarQubeStatus(text: string): string {
    if (!text) {
      return '-';
    }

    switch (text) {
      case 'OK':
        return 'passed';
      case 'ERROR':
        return 'failed';
      case 'WARN':
        return 'warn';
    }
  }

  sonarQubeStatusColor(text: string): string {
    switch (text) {
      case 'OK':
        return '#0abf5b,#e8f7f4';
      case 'WARN':
        return '#f8ac58,#fef6ee';
      case 'ERROR':
        return '#e54545,#fdefef';
      default:
        return '';
    }
  }

  getMultiBranchCategory(history: PipelineHistory) {
    return get(history, 'multiBranchCategory', '');
  }

  getPrInfo(history: PipelineHistory) {
    return `${history.branch} (${history.prSourceBranch}) → (${history.prTargetBranch}) ${history.prTitle}`;
  }
}
