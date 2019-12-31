import {
  AsyncDataLoader,
  COMMON_READABLE_ACTIONS,
  COMMON_WRITABLE_ACTIONS,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
} from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogRef,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MultiBranchFilters,
  PipelineApiService,
  PipelineConfig,
  PipelineKind,
  PipelineTemplate,
  TriggerPipelineParameter,
} from '@app/api';
import { Constants, RESOURCE_TYPES, TOKEN_CONSTANTS } from '@app/constants';
import { PipelineHistoriesComponent } from '@app/modules/pipeline/components/histories/histories.component';
import { PipelineParameterTriggerComponent } from '@app/modules/pipeline/components/parameter-trigger/parameter-trigger.component';
import { toNewPipelineConfig } from '@app/modules/pipeline/utils';
import { get } from 'lodash-es';
import { BehaviorSubject, EMPTY, combineLatest, interval } from 'rxjs';
import { catchError, map, retry, switchMap, tap } from 'rxjs/operators';
@Component({
  templateUrl: 'pipeline-detail.component.html',
  styleUrls: ['pipeline-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineDetailComponent {
  activeTab: 'base' | 'jenkinsfile' = 'base';
  pullInterval = 2 * 1000;
  pullInterval$ = new BehaviorSubject<number>(this.pullInterval);

  name: string;
  project: string;
  category: string;
  activeBranch: { type: MultiBranchFilters; name: string } = null;

  params$ = this.route.paramMap.pipe(
    tap(param => {
      this.name = param.get('name');
      this.project = param.get('project');
      this.category = param.get('category');
    }),
    map(param => ({
      name: param.get('name'),
      project: param.get('project'),
    })),
  );

  pipelineConfigPermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINECONFIGS,
        action: COMMON_WRITABLE_ACTIONS,
        namespace: project,
      }),
    ),
  );

  pipelineConfigsLogsPermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINECONFIGS_LOGS,
        action: COMMON_READABLE_ACTIONS,
        namespace: project,
      }),
    ),
  );

  pipelinePermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINES,
        action: [...COMMON_READABLE_ACTIONS, ...COMMON_WRITABLE_ACTIONS],
        namespace: project,
      }),
    ),
  );

  scanPermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINECONGIFS_SCAN,
        action: [K8sResourceAction.CREATE],
        namespace: project,
      }),
    ),
  );

  pipelinesInputPermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINES_INPUT,
        action: COMMON_WRITABLE_ACTIONS,
        namespace: project,
      }),
    ),
  );

  pipelineLogsPermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINES_LOGS,
        action: COMMON_READABLE_ACTIONS,
        namespace: project,
      }),
    ),
  );

  permissions$ = combineLatest([
    this.pipelineConfigPermissions$,
    this.pipelineConfigsLogsPermissions$,
    this.pipelinePermissions$,
    this.scanPermissions$,
    this.pipelinesInputPermissions$,
    this.pipelineLogsPermissions$,
  ]).pipe(
    map(
      ([
        pipelineConfigs,
        pipelineConfigsLogs,
        pipelines,
        scan,
        pipelinesInput,
        pipelineLogs,
      ]) => {
        return {
          pipelineConfigs,
          pipelineConfigsLogs,
          pipelines,
          scan,
          pipelinesInput,
          pipelineLogs,
        };
      },
    ),
  );

  @ViewChild(PipelineHistoriesComponent, { static: false })
  histories: PipelineHistoriesComponent;

  constructor(
    private readonly k8sPermission: K8sPermissionService,
    private readonly pipelineApi: PipelineApiService,
    private readonly route: ActivatedRoute,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly dialog: DialogService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  private readonly dataFetcher = (param: any) => {
    return combineLatest([
      this.fetchPipelineDetail(param),
      this.permissions$,
    ]).pipe(
      map(([pipeline, permissions]) => ({
        pipeline,
        permissions,
      })),
    );
  };

  dataManager = new AsyncDataLoader({
    params$: this.params$,
    fetcher: this.dataFetcher,
  });

  fetchPipelineDetail(param: any) {
    return this.pullInterval$
      .pipe(
        switchMap((period: number) => {
          return period === 0 ? EMPTY : interval(period);
        }),
      )
      .pipe(
        switchMap(() => {
          return this.pipelineApi
            .getPipelineConfig(param.project, param.name)
            .pipe(
              switchMap((pipeline: PipelineConfig) => {
                const name = get(pipeline, [
                  'template',
                  'pipelineTemplateRef',
                  'name',
                ]);
                const kind = get(pipeline, [
                  'template',
                  'pipelineTemplateRef',
                  'kind',
                ]);
                if (kind.toLowerCase() === 'clusterpipelinetemplate') {
                  return this.pipelineApi
                    .clusterTemplateDetail(name)
                    .pipe(
                      map((target: PipelineTemplate) =>
                        toNewPipelineConfig<PipelineConfig>(pipeline, target),
                      ),
                    );
                } else {
                  return this.pipelineApi
                    .templateDetail(this.project, name)
                    .pipe(
                      map((targetTemplate: PipelineTemplate) =>
                        toNewPipelineConfig<PipelineConfig>(
                          pipeline,
                          targetTemplate,
                        ),
                      ),
                    );
                }
              }),
              tap((pipeline: PipelineConfig) => {
                if (
                  pipeline.status.phase !== 'Ready' ||
                  !pipeline ||
                  this.getMethod(pipeline) === PipelineKind.MultiBranch
                ) {
                  this.slowFetchData();
                } else {
                  this.stopFetchData();
                }
              }),
              catchError((err: any) => {
                this.stopFetchData();
                if (err.status === 403) {
                  this.notification.error({
                    title: this.translate.get('errorType'),
                    content: err.error.error || err.error.message,
                  });
                }
                throw err;
              }),
            );
        }),
      );
  }

  triggerPipeline() {
    this.pipelineApi
      .getPipelineConfig(this.project, this.name)
      .pipe(
        map(res => res),
        retry(3),
      )
      .subscribe(
        (pipelineConfig: PipelineConfig) => {
          const parameters: TriggerPipelineParameter[] =
            get(pipelineConfig, 'parameters') || [];
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
                  this._triggerPipeline(parameterValue);
                }
              });
          } else {
            this._triggerPipeline();
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

  deletePipeline() {
    this.dialog
      .confirm({
        title: this.translate.get('pipeline.delete_pipelineconfig_confirm', {
          name: this.name,
        }),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('pipeline.sure'),
        confirmType: ConfirmType.Danger,
        beforeConfirm: (resolve, reject) => {
          this.pipelineApi
            .deletePipelineConfig(this.project, this.name)
            .subscribe(
              () => {
                this.message.success({
                  content: this.translate.get(
                    'pipeline.pipelineconfig_delete_succ',
                    { name: this.name },
                  ),
                });
                resolve();
                this.router.navigate([
                  '/workspace',
                  this.project,
                  'pipelines',
                  this.category,
                ]);
              },
              (err: any) => {
                this.notification.error({
                  title: this.translate.get(
                    'pipeline.pipelineconfig_delete_failed',
                    { name: this.name },
                  ),
                  content: err.error.error || err.error.message,
                });
                reject();
              },
            );
        },
      })
      .then(() => {})
      .catch(() => {});
  }

  updatePipeline(pipeline: PipelineConfig, type = '') {
    if (this.getMethod(pipeline) === PipelineKind.Graph) {
      this.router.navigate(['./', 'visual-update'], {
        relativeTo: this.route,
        queryParams: {
          type,
        },
      });

      return;
    }

    this.router.navigate(['./', 'update'], {
      relativeTo: this.route,
      queryParams: {
        type: type,
      },
    });
  }

  copyPipeline(pipelineConfig: PipelineConfig) {
    const method = this.getMethod(pipelineConfig);

    if (method === PipelineKind.Graph) {
      this.router.navigate(
        [
          '/workspace',
          pipelineConfig.namespace,
          'pipelines',
          'all',
          'visual-create',
        ],
        { queryParams: { clone: pipelineConfig.name } },
      );
      return;
    }

    this.router.navigate(['../', 'create'], {
      relativeTo: this.route,
      queryParams: {
        type: 'copy',
        name: this.name,
        method,
      },
    });
  }

  changeTab(tabName: 'base' | 'jenkinsfile') {
    this.activeTab = tabName;
  }

  scan(config: PipelineConfig) {
    this.pipelineApi.scan(config.namespace, config.name).subscribe(
      () => {
        this.message.success({
          content: this.translate.get('pipeline.scan_successed'),
        });
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

  onToggleBranch(event: { type: MultiBranchFilters; name: string }) {
    this.activeBranch = event;
  }

  onTabSelectedChange(index: number) {
    if (index === 0) {
      this.activeBranch = null;
    }
  }

  getBranchs(config: PipelineConfig): any {
    if (this.getMethod(config) === PipelineKind.MultiBranch) {
      return [
        MultiBranchFilters.Branch,
        MultiBranchFilters.PullRequest,
        MultiBranchFilters.Tag,
      ].map(type => {
        const actived = JSON.parse(
          get(config, [
            'annotations',
            `${this.constants.ANNOTATION_PREFIX}/jenkins.${type}`,
          ]) || '[]',
        ) as string[];

        const staled = JSON.parse(
          get(config, [
            'annotations',
            `${this.constants.ANNOTATION_PREFIX}/jenkins.stale.${type}`,
          ]) || '[]',
        ) as string[];

        return {
          type,
          items: actived.concat(staled).map(name => ({ name, type })),
        };
      });
    }

    return null;
  }

  private _triggerPipeline(parameters?: any) {
    this.pipelineApi
      .triggerPipeline(this.project, this.name, parameters)
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('pipeline_start_succ'),
          });
          this.histories.historyRefresh(true);
        },
        (err: any) => {
          this.notification.error({
            title: this.translate.get('pipeline_start_fail'),
            content: err.error.error || err.error.message,
          });
        },
      );
  }

  private slowFetchData() {
    this.pullInterval = 5 * 1000;
    this.pullInterval$.next(this.pullInterval);
    this.cdr.detectChanges();
  }

  private stopFetchData() {
    this.pullInterval = 0;
    this.pullInterval$.next(this.pullInterval);
    this.cdr.detectChanges();
  }
}
