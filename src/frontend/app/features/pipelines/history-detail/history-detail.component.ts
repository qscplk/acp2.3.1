import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  isAllowed,
  TranslateService,
} from '@alauda/common-snippet';

import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import {
  PipelineApiService,
  PipelineHistory,
  ReportsApiService,
} from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { get } from 'lodash-es';
import { BehaviorSubject, EMPTY, combineLatest, interval, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-history-detail',
  templateUrl: './history-detail.component.html',
  styleUrls: ['./history-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryDetailComponent {
  project: string;
  name: string;
  historyName: string;
  running = true;
  reportCounts = {
    total: 0,
    failed: 0,
  };

  pullInterval = 4 * 1000;
  pullInterval$ = new BehaviorSubject<number>(this.pullInterval);

  params$ = this.route.paramMap.pipe(
    map((params: ParamMap) => {
      return {
        project: params.get('project'),
        name: params.get('name'),
        historyName: params.get('historyName'),
      };
    }),
    tap(param => {
      this.project = param.project;
      this.name = param.name;
      this.historyName = param.historyName;
    }),
    publishReplay(1),
    refCount(),
  );

  pipelinePermissions$ = this.params$.pipe(
    switchMap(({ project }) => {
      return this.k8sPermission.getAccess({
        type: RESOURCE_TYPES.PIPELINES,
        action: [
          K8sResourceAction.CREATE,
          K8sResourceAction.UPDATE,
          K8sResourceAction.DELETE,
        ],
        namespace: project,
      });
    }),
    isAllowed(),
  );

  pipelinesInputPermissions$ = this.params$.pipe(
    switchMap(({ project }) => {
      return this.k8sPermission.getAccess({
        type: RESOURCE_TYPES.PIPELINES_INPUT,
        action: [K8sResourceAction.CREATE],
        namespace: project,
      });
    }),
    isAllowed(),
  );

  permissions$ = combineLatest([
    this.pipelinePermissions$,
    this.pipelinesInputPermissions$,
  ]).pipe(
    map(([pipelines, pipelinesInput]) => {
      return {
        pipelines,
        pipelinesInput,
      };
    }),
  );

  private readonly dataFetcher = (param: {
    project: string;
    name: string;
    historyName: string;
  }) => {
    return combineLatest([this.fetchData(param), this.permissions$]).pipe(
      map(([data, permissions]) => ({
        history: data.history,
        report: data.report,
        permissions,
      })),
    );
  };

  dataManager = new AsyncDataLoader({
    params$: this.params$,
    fetcher: this.dataFetcher,
  });

  fetchData(params: { project: string; name: string; historyName: string }) {
    return this.pullInterval$
      .pipe(
        switchMap((period: number) => {
          return period === 0 ? EMPTY : interval(period);
        }),
      )
      .pipe(
        switchMap(() => {
          return combineLatest([
            this.api
              .getPipelineHistory(params.project, params.historyName, {
                withFreshStages: true,
              })
              .pipe(
                map(res => res),
                tap((history: PipelineHistory) => {
                  const currentStatus = get(history, 'status.phase', '');
                  this.running = ['Queued', 'Pending', 'Running'].includes(
                    currentStatus,
                  );

                  if (this.running) {
                    this.slowFetchData();
                  } else {
                    this.stopFetchData();
                  }

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
              ),
            this.getTestReportCount({
              project: params.project,
              name: params.historyName,
            }),
          ]).pipe(
            map(([history, report]) => ({
              history,
              report,
            })),
            tap(data => {
              const currentStatus = get(data.history, 'status.phase', '');
              this.running = ['Queued', 'Pending', 'Running'].includes(
                currentStatus,
              );
              this.reportCounts = data.report;
              this.cdr.detectChanges();
            }),
            publishReplay(1),
            refCount(),
          );
        }),
      );
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: PipelineApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notification: NotificationService,
    private readonly k8sPermission: K8sPermissionService,
    private readonly translate: TranslateService,
    private readonly reportsApi: ReportsApiService,
  ) {}

  pipelineStatusChange(pipelineName: string) {
    this.router.navigate(['../../', pipelineName], { relativeTo: this.route });
  }

  private slowFetchData() {
    this.pullInterval = 4 * 1000;
    this.pullInterval$.next(this.pullInterval);
    this.cdr.detectChanges();
  }

  private stopFetchData() {
    this.pullInterval = 0;
    this.pullInterval$.next(this.pullInterval);
    this.cdr.detectChanges();
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
        catchError((_e: any) => {
          this.running = false;
          this.cdr.detectChanges();
          return of({
            total: 0,
            failed: 0,
          });
        }),
      );
  }
}
