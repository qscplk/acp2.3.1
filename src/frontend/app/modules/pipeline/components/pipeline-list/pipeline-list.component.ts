import { TranslateService } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogRef,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
  Sort,
} from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  PipelineApiService,
  PipelineConfig,
  PipelineKind,
  PipelineTrigger,
  TriggerPipelineParameter,
} from '@app/api';
import {
  getCodeCheckNameByValue,
  hasEnabledTriggers,
  mapTriggerIcon,
  mapTriggerTranslateKey,
} from '@app/modules/pipeline/utils';
import { get } from 'lodash-es';
import { map, retry } from 'rxjs/operators';

import { PipelineParameterTriggerComponent } from '../parameter-trigger/parameter-trigger.component';

@Component({
  selector: 'alo-pipeline-list',
  templateUrl: 'pipeline-list.component.html',
  styleUrls: ['pipeline-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineListComponent {
  @Input()
  pipelines: PipelineConfig[] = [];

  @Input()
  project: string;

  @Input()
  category: string;

  @Input()
  sort: Sort;

  @Input()
  columns = [
    'name',
    'history',
    // 'belongs_application',
    'triggers',
    'actions',
  ];

  @Input()
  permissions: {
    pipelineConfigs: {
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    pipelines: {
      create: boolean;
    };
    scan: {
      create: boolean;
    };
    pipelineLogs: {
      get: boolean;
    };
  };

  @Output()
  started = new EventEmitter<PipelineConfig>();

  @Output()
  deleted = new EventEmitter<PipelineConfig>();

  @Output()
  sortChange = new EventEmitter<{ active: string; direction: string }>();

  mapTriggerIcon = mapTriggerIcon;
  getCodeCheckNameByValue = getCodeCheckNameByValue;
  hasEnabledTriggers = hasEnabledTriggers;

  constructor(
    private readonly translate: TranslateService,
    private readonly dialog: DialogService,
    private readonly router: Router,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly pipelineApi: PipelineApiService,
  ) {}

  getTriggerHint(trigger: PipelineTrigger) {
    return `${this.translate.get('enabled')} ${this.translate.get(
      mapTriggerTranslateKey(trigger.type),
    )} ${this.translate.get('pipeline_trigger')}, ${this.translate.get(
      'pipeline.trigger_rules',
    )}: ${this.translate.get(getCodeCheckNameByValue(trigger.rule))}`;
  }

  pipelineIdentity(_: number, pipeline: PipelineConfig) {
    return `${pipeline.namespace}/${pipeline.name}`;
  }

  start(pipeline: PipelineConfig) {
    this.pipelineApi
      .getPipelineConfig(pipeline.namespace, pipeline.name)
      .pipe(
        map(res => res),
        retry(3),
      )
      .subscribe(
        (pipeline: PipelineConfig) => {
          const parameters: TriggerPipelineParameter[] =
            get(pipeline, 'parameters') || [];
          if (parameters.length) {
            const parameterDialogRef: DialogRef<PipelineParameterTriggerComponent> = this.dialog.open(
              PipelineParameterTriggerComponent,
              {
                size: DialogSize.Medium,
                data: {
                  parameters: parameters,
                },
              },
            );
            parameterDialogRef
              .afterClosed()
              .subscribe((parameterValue: any) => {
                if (parameterValue) {
                  this._triggerPipeline(pipeline, parameterValue);
                }
              });
          } else {
            this._triggerPipeline(pipeline);
          }
        },
        (err: any) => {
          this.notification.error({
            title: this.translate.get('pipeline.history_failed'),
            content: err.error.error || err.error.message,
          });
        },
      );
  }

  sortChanged(event: { active: string; direction: string }) {
    this.sortChange.emit(event);
  }

  delete(pipeline: PipelineConfig) {
    this.dialog
      .confirm({
        title: this.translate.get('pipeline_delete_confirm', {
          name: pipeline.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('pipeline.sure'),
        confirmType: ConfirmType.Danger,
        beforeConfirm: (resolve, reject) => {
          this.pipelineApi
            .deletePipelineConfig(pipeline.namespace, pipeline.name)
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
        this.deleted.emit(pipeline);
      })
      .catch(() => {});
  }

  update(item: PipelineConfig) {
    if (this.getMethod(item) === PipelineKind.Graph) {
      this.router.navigate([
        '/workspace',
        item.namespace,
        'pipelines',
        this.category,
        item.name,
        'visual-update',
      ]);
      return;
    }

    this.router.navigate([
      '/workspace',
      item.namespace,
      'pipelines',
      this.category,
      item.name,
      'update',
    ]);
  }

  copy(item: PipelineConfig) {
    const method = this.getMethod(item);

    if (method === PipelineKind.Graph) {
      this.router.navigate(
        ['/workspace', item.namespace, 'pipelines', 'all', 'visual-create'],
        { queryParams: { clone: item.name } },
      );
      return;
    }

    this.router.navigate(
      ['/workspace', item.namespace, 'pipelines', this.category, 'create'],
      {
        queryParams: {
          type: 'copy',
          name: item.name,
          method,
        },
      },
    );
  }

  scan(config: PipelineConfig) {
    this.pipelineApi.scan(config.namespace, config.name).subscribe(
      () => {
        this.message.success({
          content: this.translate.get('pipeline.scan_successed'),
        });
        this.router.navigate([
          '/workspace',
          config.namespace,
          'pipelines',
          'all',
          config.name,
        ]);
      },
      (res: HttpErrorResponse) => {
        this.notification.error({
          title: this.translate.get('pipeline.scan_failed'),
          content: res.error.error || res.error.message,
        });
      },
    );
  }

  getMethod(config: PipelineConfig) {
    const kind = get(config, ['labels', 'pipeline.kind']);
    return kind === 'multi-branch'
      ? PipelineKind.MultiBranch
      : get(config, '__original.spec.template.pipelineTemplate')
      ? PipelineKind.Graph
      : get(config, 'labels.templateName')
      ? PipelineKind.Template
      : PipelineKind.Script;
  }

  private _triggerPipeline(pipeline: PipelineConfig, paramters?: any) {
    this.pipelineApi
      .triggerPipeline(pipeline.namespace, pipeline.name, paramters)
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('pipeline_start_succ'),
          });
          this.started.emit(pipeline);
        },
        (err: any) => {
          this.notification.error({
            title: this.translate.get('pipeline_start_fail'),
            content: err.error.error || err.error.message,
          });
        },
      );
  }
}
