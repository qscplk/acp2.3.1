import { TranslateService } from '@alauda/common-snippet';
import { DialogService, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { activeState } from '@app/utils/redux';
import * as R from 'ramda';
import { Subject, forkJoin, of } from 'rxjs';
import { concatMap, map, take, takeUntil, tap } from 'rxjs/operators';

import { DynamicFormBuilderService } from './dynamic-forms/service';
import {
  ActiveStateSelector,
  GraphPipelineConfig,
  PipelineVisualEditorStoreService,
  TaskResoruce,
  compileTask,
  fromDatasource,
  resetPipeline,
  selectSelected,
  selectValid,
  setTasks,
  toDatasource,
} from './store';

@Component({
  selector: 'alo-pipeline-visual-editor',
  templateUrl: 'component.html',
  styleUrls: ['component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PipelineVisualEditorStoreService, DynamicFormBuilderService],
})
export class PipelineVisualEditorComponent implements OnInit, OnDestroy {
  constructor(
    private readonly store: PipelineVisualEditorStoreService,
    private readonly fb: DynamicFormBuilderService,
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notification: NotificationService,
    private readonly location: Location,
  ) {}

  @Input()
  name: string;

  @Input()
  project: string;

  @Input()
  isClone = false;

  loading = false;

  destroy$ = new Subject<void>();

  error: any = null;

  submitted = false;

  form$ = this.store.select(selectSelected).pipe(
    map(
      R.cond([
        [
          R.test(/^(after\/|of\/)/),
          R.pipe(
            R.split('/'),
            R.zipObj(['prefix', 'id']),
            R.merge({ type: 'task-select' }),
          ),
        ],
        [
          R.test(/^(parallel\/)/),
          R.pipe(
            R.split('/'),
            R.zipObj(['prefix', 'id']),
            R.merge({ type: 'parallel-detail' }),
          ),
        ],
        [
          R.test(/^(stage\/)/),
          R.pipe(
            R.split('/'),
            R.zipObj(['prefix', 'id']),
            R.merge({ type: 'stage-detail' }),
          ),
        ],
        [R.T, R.always({ type: 'pipeline-settings' })],
      ]),
    ),
  );

  valid$ = this.store.select(selectValid);

  ngOnInit() {
    this.loadPipeline();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  loadPipeline() {
    this.loading = true;
    this.error = null;

    forkJoin(this.fetchTasks(), this.fetchPipeline())
      .pipe(
        map(([taskResources, pipeline]) => {
          const customControlConfigs = this.fb.getCustomControlConfigs(
            this.project,
          );
          if (!pipeline) {
            const tasks = R.map(
              compileTask(customControlConfigs),
              taskResources,
            );
            return setTasks(tasks);
          }

          return resetPipeline(
            fromDatasource(pipeline, taskResources, customControlConfigs),
          );
        }),
        takeUntil(this.destroy$),
        tap(
          () => {
            this.loading = false;
            this.cdr.markForCheck();
          },
          error => {
            this.error = error;
            this.loading = false;
            this.cdr.markForCheck();
          },
        ),
      )
      .subscribe(action => this.store.dispatch(action));
  }

  savePipeline() {
    this.submitted = true;

    this.store
      .select(state => state)
      .pipe(
        take(1),
        tap(state => {
          if (!selectValid(state)) {
            this.dialog
              .confirm({
                title: this.translate.get(
                  'validation_not_passed_please_correct',
                ),
                confirmText: this.translate.get('i_know'),
                cancelButton: false,
              })
              .catch(() => {});

            throw new PassThroughError();
          }
        }),
        map(activeState as ActiveStateSelector),
        tap(state => {
          if (!state.parallels.ids.length) {
            this.dialog
              .confirm({
                title: this.translate.get(
                  'require_at_least_add_one_pipeline_stage',
                ),
                confirmText: this.translate.get('i_know'),
                cancelButton: false,
              })
              .catch(() => {});

            throw new PassThroughError();
          }
        }),
        map(({ parallels, forks, stages, stageForms, pipelineForm, tasks }) => {
          return toDatasource(
            this.project,
            parallels,
            forks,
            tasks.all,
            stages,
            pipelineForm,
            stageForms,
          );
        }),
        concatMap((pipeline: GraphPipelineConfig) =>
          this.name && !this.isClone
            ? this.http.put(
                `{{API_GATEWAY}}/devops/api/v1/pipelineconfig/${this.project}/${this.name}`,
                pipeline,
              )
            : this.http.post(
                `{{API_GATEWAY}}/devops/api/v1/pipelineconfig/${this.project}`,
                pipeline,
              ),
        ),
        map(res => R.path(['metadata', 'name'], res)),
      )
      .subscribe(
        (name: string) => {
          this.router.navigate([
            '/workspace',
            this.project,
            'pipelines',
            'all',
            name || this.name,
          ]);
        },
        (error: any) => {
          if (!error || error.passThrouth) {
            return;
          }

          this.notification.error({
            title: this.translate.get(
              this.name ? 'update_failed' : 'create_failed',
            ),
            content: error.error && (error.error.error || error.error.message),
          });
        },
      );
  }

  cancel() {
    this.dialog
      .confirm({
        title: this.name
          ? this.translate.get('sure_cancel_update_pipeline', {
              name: this.name,
            })
          : this.translate.get('sure_cancel_create_pipeline'),
        content: this.name
          ? this.translate.get(
              'when_confirm_cancel_update_the_content_already_edited_not_take_effect',
            )
          : this.translate.get(
              'when_confirm_cancel_create_the_content_already_edited_not_take_effect',
            ),
        confirmText: this.translate.get('sure'),
        cancelText: this.translate.get('cancel'),
      })
      .then(
        () => {
          if (this.name) {
            this.location.back();
            return;
          }

          this.router.navigate([
            '/workspace',
            this.project,
            'pipelines',
            'all',
          ]);
        },
        () => {},
      );
  }

  private fetchTasks() {
    return forkJoin([
      this.http.get<{ clusterpipelinetasktemplates: TaskResoruce[] }>(
        '{{API_GATEWAY}}/devops/api/v1/clusterpipelinetasktemplate?filterBy=labels,latest:true',
      ),
      this.http.get<{ pipelinetasktemplates: TaskResoruce[] }>(
        `{{API_GATEWAY}}/devops/api/v1/pipelinetasktemplate/${this.project}?filterBy=labels,latest:true`,
      ),
    ]).pipe(
      map(([{ clusterpipelinetasktemplates }, { pipelinetasktemplates }]) =>
        R.concat(
          clusterpipelinetasktemplates || [],
          pipelinetasktemplates || [],
        ),
      ),
    );
  }

  private fetchPipeline() {
    return this.name && this.project
      ? this.http.get<GraphPipelineConfig>(
          `{{API_GATEWAY}}/devops/api/v1/pipelineconfig/${this.project}/${this.name}`,
        )
      : of(null);
  }
}

class PassThroughError extends Error {
  constructor(public passThrouth = true) {
    super();
  }
}
