import { TranslateService } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogRef,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  MultiBranchFilters,
  PipelineApiService,
  PipelineConfig,
  TriggerPipelineParameter,
} from '@app/api';
import { toPipelineHistory } from '@app/api/pipeline/utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';
import { get, uniq } from 'lodash-es';
import { retry } from 'rxjs/operators';

import { PipelineParameterTriggerComponent } from '../parameter-trigger/parameter-trigger.component';

@Component({
  selector: 'alo-pipeline-branches',
  templateUrl: 'pipeline-branches.component.html',
  styleUrls: ['pipeline-branches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineBranchesComponent implements OnInit, OnChanges {
  @Input()
  pipeline: PipelineConfig;

  @Input()
  permissions: {
    pipelineLogs: {
      get: boolean;
    };
    pipelines: {
      create: boolean;
      get: boolean;
    };
  };

  @Output()
  branchChange = new EventEmitter<{
    type: MultiBranchFilters;
    name: string;
  }>();

  @Output()
  deleted = new EventEmitter<void>();

  @Output()
  started = new EventEmitter<void>();

  columns = ['name', 'status', 'actions'];

  items: any[] = [];
  groups = [
    { type: MultiBranchFilters.PullRequest, count: 0, enabled: true },
    { type: MultiBranchFilters.Branch, count: 0, enabled: true },
    { type: MultiBranchFilters.Tag, count: 0, enabled: false },
  ];

  filters = MultiBranchFilters;

  translates = {
    [MultiBranchFilters.Branch]: 'pipeline.multi_branch_filter_branch',
    [MultiBranchFilters.PullRequest]: 'pipeline.multi_branch_filter_pr',
    [MultiBranchFilters.Tag]: 'pipeline.multi_branch_filter_tag',
  };

  filterBy = MultiBranchFilters.PullRequest;

  constructor(
    private readonly pipelineApi: PipelineApiService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  ngOnInit() {
    this.items = this.getChilds();
    this.groups = this.getGroups();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.pipeline && !changes.pipeline.firstChange) {
      this.items = this.getChilds();
      this.groups = this.getGroups();
    }
  }

  onFilterChange(filter: MultiBranchFilters) {
    this.filterBy = filter;
    this.items = this.getChilds();
    this.groups = this.getGroups();
  }

  start(item: any) {
    this.pipelineApi
      .getPipelineConfig(item.namespace, item.config)
      .pipe(retry(3))
      .subscribe((pipelineConfig: PipelineConfig) => {
        // multi pipeline的trigger params信息放在pipelineConfig的annotations中
        // 分支/pr名称按照后端约定 特殊字符都替换成-
        const multiName = item.name.replace(/[^0-9a-zA-Z-]/g, '-');
        let parameters: TriggerPipelineParameter[];
        try {
          parameters = JSON.parse(
            get(pipelineConfig, [
              'annotations',
              `${this.constants.ANNOTATION_PREFIX}/jenkins.${multiName}.params`,
            ]),
          );
        } catch {
          parameters = [];
        }

        if (parameters.length) {
          const parameterDialogRef: DialogRef<PipelineParameterTriggerComponent> = this.dialog.open(
            PipelineParameterTriggerComponent,
            {
              size: DialogSize.Medium,
              data: {
                parameters,
              },
            },
          );
          parameterDialogRef.afterClosed().subscribe((parameterValue: any) => {
            if (parameterValue) {
              this.triggerPipeline(item, parameterValue);
            }
          });
        } else {
          this.triggerPipeline(item);
        }
      });
  }

  histories(item: any) {
    this.branchChange.next({
      type: item.type,
      name: item.name,
    });
  }

  delete(item: any) {
    this.dialog
      .confirm({
        title: this.translate.get('pipeline_delete_confirm', {
          name: item.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('pipeline.sure'),
        confirmType: ConfirmType.Danger,
        beforeConfirm: (resolve, reject) => {
          this.pipelineApi
            .deletePipelineConfig(item.namespace, item.config)
            .subscribe(
              () => {
                this.message.success({
                  content: this.translate.get('pipeline_delete_succ'),
                });
                resolve();
              },
              (err: any) => {
                this.notification.error({
                  title: this.translate.get('pipeline_delete_fail'),
                  content: err.error.error || err.error.message,
                });
                reject();
              },
            );
        },
      })
      .then(() => {
        this.deleted.emit(item);
      })
      .catch(() => {});
  }

  private getGroups() {
    return [
      MultiBranchFilters.PullRequest,
      MultiBranchFilters.Branch,
      // MultiBranchFilters.Tag,
    ].map(type => {
      return {
        type,
        count: uniq([
          ...this.getBranchNames(type, true),
          ...this.getBranchNames(type, false),
        ]).length,
        enabled: type !== MultiBranchFilters.Tag,
      };
    });
  }

  private triggerPipeline(
    item: any,
    parameters?: { params: TriggerPipelineParameter[] },
  ) {
    this.pipelineApi
      .triggerPipeline(item.namespace, item.config, {
        ...parameters,
        branch: item.name,
      })
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('pipeline_start_succ'),
          });
          this.started.emit(item);
        },
        (err: any) => {
          this.notification.error({
            title: this.translate.get('pipeline_start_fail'),
            content: err.error.error || err.error.message,
          });
        },
      );
  }

  private getChilds() {
    return this.getPipelineByFilter(false).concat(
      this.getPipelineByFilter(true),
    );
  }

  private getPipelineByFilter(stale: boolean) {
    return this.getBranchNames(this.filterBy, stale).map(name => {
      const detail = JSON.parse(
        get(
          this.pipeline,
          [
            'annotations',
            `${this.constants.ANNOTATION_PREFIX}/jenkins.${name}`,
          ],
          '{}',
        ),
      );
      return {
        name,
        prTitle: get(detail.title, ''),
        prUrl: get(detail, ['url'], ''),
        config: this.pipeline.name,
        namespace: this.pipeline.namespace,
        type: this.filterBy,
        stale,
        histories: this.getHistoriesByBranchName(name).map((item: any) =>
          toPipelineHistory(item, this.constants),
        ),
      };
    });
  }

  private getBranchNames(type: MultiBranchFilters, stale: boolean): string[] {
    return JSON.parse(
      get(this.pipeline, [
        'annotations',
        `${this.constants.ANNOTATION_PREFIX}/jenkins.${
          stale ? 'stale.' : ''
        }${type}`,
      ]) || '[]',
    ) as string[];
  }

  private getHistoriesByBranchName(name: string) {
    return (
      get(this.pipeline, ['__original', 'mulitiBranchPipelines', name]) || []
    );
  }
}
