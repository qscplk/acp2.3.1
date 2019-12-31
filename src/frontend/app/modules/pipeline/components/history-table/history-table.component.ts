import { TranslateService } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  MultiBranchFilters,
  PipelineApiService,
  PipelineHistory,
  PiplineTaskInput,
} from '@app/api';
import { LogsComponent } from '@app/modules/pipeline/components/logs/logs.component';
import {
  getHistoryStatus,
  mapTriggerTranslateKey,
} from '@app/modules/pipeline/utils';

import { get } from 'lodash-es';
import { interval } from 'rxjs';
import { map, publishReplay, refCount } from 'rxjs/operators';

import { PipelineHistoryStepInputDialogComponent } from '../history-step-input-dialog/history-step-input-dialog.component';

@Component({
  selector: 'alo-pipeline-history-table',
  templateUrl: './history-table.component.html',
  styleUrls: [
    './history-table.component.scss',
    '../../shared-style/status.scss',
    '../../shared-style/fields.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryTableComponent {
  get columns() {
    return [
      'name',
      ...(this.showWaiting ? ['pipeline'] : []),
      ...(this.branchs ? ['branch'] : []),
      'status',
      'startedAt',
      'time',
      'cause',
      'actions',
    ];
  }

  mapTriggerTranslateKey: (_: string) => {} = mapTriggerTranslateKey;

  @Input()
  showWaiting = false;

  @Input()
  historyList: { total: number; histories: PipelineHistory[] };

  @Input()
  project: string;

  @Input()
  loading: boolean;

  @Input()
  hideTitle = false;

  @Input()
  branchs: Array<{
    type: MultiBranchFilters;
    items: Array<{
      type: MultiBranchFilters;
      name: string;
    }>;
  }> = null;

  @Input()
  activeBranch: {
    type: MultiBranchFilters;
    name: string;
  };

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
    pipelineLogs: {
      get: boolean;
    };
  };
  @Input()
  pageIndex = 0;

  @Input()
  pageSize = 10;

  @Output()
  paramsChanged: EventEmitter<{
    pageIndex?: number;
    pageSize?: number;
    searchKey?: string;
    active?: string;
    desc?: boolean;
  }> = new EventEmitter();

  @Output()
  branchChange = new EventEmitter<{ type: MultiBranchFilters; name: string }>();

  branchTypeTranslates = {
    [MultiBranchFilters.Branch]: 'pipeline.multi_branch_filter_branch',
    [MultiBranchFilters.PullRequest]: 'pipeline.multi_branch_filter_pr',
    [MultiBranchFilters.Tag]: 'pipeline.multi_branch_filter_tag',
  };

  currentDate = interval(2000).pipe(
    map(() => new Date().getTime()),
    publishReplay(1),
    refCount(),
  );

  get viewLogsPermission() {
    return get(this.permissions, 'pipelineLogs.get', false);
  }

  constructor(
    private readonly dialog: DialogService,
    private readonly api: PipelineApiService,
    private readonly auiDialog: DialogService,
    private readonly translate: TranslateService,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
  ) {}

  branchIdentity(value: { type: MultiBranchFilters; name: string }) {
    return value ? `${value.type}/${value.name}` : 'all';
  }

  branchOptionIdentity(
    _: number,
    value: { type: MultiBranchFilters; name: string },
  ) {
    return value ? `${value.type}/${value.name}` : 'all';
  }

  branchGroupIdentity(_: number, value: { name: string }) {
    return value.name;
  }

  filterByBranchName(
    filter: string,
    option: { value: { type: MultiBranchFilters; name: string } },
  ) {
    return option.value.name.includes(filter);
  }

  onBranchChange(branch: { type: MultiBranchFilters; name: string }) {
    if (!branch) {
      return;
    }

    this.branchChange.emit(branch);
  }

  getHistoryStatusIcon(status: any) {
    const phase =
      get(status, ['jenkins', 'status'], '') === 'PAUSED_PENDING_INPUT'
        ? 'Paused'
        : get(status, 'phase', '');
    return getHistoryStatus(phase);
  }

  openLogs(history: PipelineHistory) {
    this.dialog.open(LogsComponent, {
      size: DialogSize.Large,
      data: history,
    });
  }

  search(searchKey: string) {
    this.paramsChanged.emit({ searchKey: searchKey });
  }

  pageChange(event: { pageIndex: number; pageSize: number }) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.paramsChanged.emit(event);
  }

  getDateTimes(dateString: string) {
    return new Date(dateString).getTime();
  }

  sortChange(event: { active: string; direction: string }) {
    this.paramsChanged.emit({
      active: event.active,
      desc: event.direction === 'desc',
    });
  }

  delete(item: PipelineHistory) {
    this.auiDialog
      .confirm({
        title: this.translate.get('pipeline.delete_history_confirm', {
          name: item.jenkins.build ? `#${item.jenkins.build}` : item.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('delete'),
        confirmType: ConfirmType.Primary,
        beforeConfirm: (resolve, reject) => {
          this.api.deletePipeline(this.project, item.name).subscribe(
            () => {
              this.successNotification(item, 'history_delete_succ');
              resolve();
            },
            (err: any) => {
              this.errorMessage(err, item, 'history_delete_fail');
              reject();
            },
          );
        },
      })
      .then(() => {
        this.paramsChanged.emit({});
      })
      .catch(() => {
        this.auiDialog.closeAll();
      });
  }

  replay(item: PipelineHistory) {
    this.api.retryPipeline(this.project, item.name, item.branch).subscribe(
      () => {
        this.paramsChanged.emit({});
        this.successNotification(item, 'history_replay_succ');
      },
      (err: any) => {
        this.errorMessage(err, item, 'history_replay_fail');
      },
    );
  }

  cancel(item: PipelineHistory) {
    this.auiDialog
      .confirm({
        title: this.translate.get('pipeline.cancel_history_confirm', {
          name: item.jenkins.build ? `#${item.jenkins.build}` : item.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('pipeline.cancel'),
        confirmType: ConfirmType.Primary,
        beforeConfirm: (resolve, reject) => {
          this.api.abortPipeline(this.project, item.name).subscribe(
            () => {
              this.successNotification(item, 'history_cancel_succ');
              resolve();
            },
            (err: any) => {
              this.errorMessage(err, item, 'history_cancel_fail');
              reject();
            },
          );
        },
      })
      .then(() => {
        this.paramsChanged.emit({});
      })
      .catch(() => {
        this.auiDialog.closeAll();
      });
  }

  trackFn(_: number, history: PipelineHistory) {
    return `${history.namespace}/${history.name}`;
  }

  private errorMessage(
    err: any,
    item: PipelineHistory,
    translationKey: string,
  ) {
    this.notification.error({
      title: this.translate.get(`pipeline.${translationKey}`, {
        name: item.name,
      }),
      content: err.error.error || err.error.message,
    });
  }

  private successNotification(item: PipelineHistory, translationKey: string) {
    this.message.success({
      content: this.translate.get(`pipeline.${translationKey}`, {
        name: item.name,
      }),
    });
  }

  sonarQubeStatusColor(text: string): string {
    switch (text) {
      case 'OK':
        return '#fff,#0abf5b';
      case 'WARN':
        return '#fff,#f8ac58';
      case 'ERROR':
        return '#fff,#e54545';
      default:
        return '';
    }
  }

  trackByFn(index: number) {
    return index;
  }

  getPausedStages(history: PipelineHistory) {
    return get(history, ['jenkins', 'stages'], []).filter(
      (item: any) => item.status === 'PAUSED' && !this.isParallelStage(item),
    );
  }

  isParallelStage(stage: any) {
    const edges = get(stage, 'edges', []);
    return edges.length
      ? edges.some((item: any) => get(item, 'type') === 'PARALLEL')
      : false;
  }

  openWaitingInputDialog(history: PipelineHistory, stage: PiplineTaskInput) {
    const dialogRef = this.dialog.open(
      PipelineHistoryStepInputDialogComponent,
      {
        size: DialogSize.Large,
        data: {
          history,
          stage,
          project: this.project,
        },
      },
    );

    dialogRef.afterClosed().subscribe(() => {
      this.paramsChanged.emit({});
    });
  }
}
