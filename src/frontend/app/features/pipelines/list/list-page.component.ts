import {
  COMMON_READABLE_ACTIONS,
  COMMON_WRITABLE_ACTIONS,
  K8sPermissionService,
  K8sResourceAction,
} from '@alauda/common-snippet';
import { DialogRef, DialogService, DialogSize } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import {
  // ApplicationApiService,
  PipelineApiService,
  PipelineConfig,
  PipelineHistory,
  PipelineKind,
} from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { ModeSelectComponent } from '@app/modules/pipeline/components/mode-select/mode-select.component';
import { FeatureGateService } from '@alauda/common-snippet';
import { filterBy, getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { shallowEqual } from '@app/utils/shallow-equal';
import {
  Subject,
  combineLatest,
  // of,
} from 'rxjs';
import {
  // catchError,
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPageComponent implements OnDestroy {
  params$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    map(([paramMap, queryParamMap]) => {
      const project = paramMap.get('project') || '';
      const category = paramMap.get('category') || 'all';
      const searchBy = queryParamMap.get('search_by') || 'name';
      const keywords = queryParamMap.get('keywords') || '';
      const appFilter = queryParamMap.get('app') || 'all';
      const pageIndex = +(queryParamMap.get('page') || '1') - 1;
      const itemsPerPage = +(queryParamMap.get('page_size') || 20);
      const sort = queryParamMap.get('sort') || 'name';
      const direction = queryParamMap.get('direction') || 'asc';

      return {
        project,
        category,
        searchBy,
        keywords,
        appFilter,
        pageIndex,
        itemsPerPage,
        sort,
        direction,
      };
    }),
    distinctUntilChanged(shallowEqual),
    tap(({ searchBy, keywords }) => {
      this.searchBy = searchBy;
      this.orignalSearchBy = searchBy;
      this.orignalKeywords = keywords;
    }),
    publishReplay(1),
    refCount(),
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

  pipelinePermissions$ = this.params$.pipe(
    switchMap(({ project }) =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINES,
        action: COMMON_WRITABLE_ACTIONS,
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
    this.pipelinePermissions$,
    this.scanPermissions$,
    this.pipelinesInputPermissions$,
    this.pipelineLogsPermissions$,
  ]).pipe(
    map(([pipelineConfigs, pipelines, scan, pipelinesInput, pipelineLogs]) => {
      return {
        pipelineConfigs,
        pipelines,
        scan,
        pipelinesInput,
        pipelineLogs,
      };
    }),
  );

  forceReload$ = new Subject<void>();

  searchBy = 'name';

  orignalSearchBy = 'name';

  orignalKeywords = '';

  waitingCount = 0;

  private dialogRef: DialogRef<any>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pipelineApi: PipelineApiService,
    private readonly dialog: DialogService,
    private readonly k8sPermission: K8sPermissionService, // private applicationApi: ApplicationApiService,
    public featureGate: FeatureGateService,
  ) {}

  findPipelines = ({ project, ...params }: any) => {
    return this.pipelineApi.findPipelineConfigs(
      project,
      getQuery(
        filterBy(params.searchBy, params.keywords),
        filterBy(
          'label',
          '',
          // params.appFilter === 'all' ? '' : `app:${params.appFilter}`,
        ),
        filterBy(
          'label',
          params.category === 'all' ? '' : `category:${params.category}`,
        ),
        pageBy(params.pageIndex, params.itemsPerPage),
        sortBy(params.sort, params.direction === 'desc'),
      ),
    );
  };

  search(keywords: string) {
    if (
      keywords === this.orignalKeywords &&
      this.searchBy === this.orignalSearchBy
    ) {
      this.forceReload$.next();
      return;
    }

    this.mergeQueryParams({
      keywords,
      page: 1,
      search_by: this.searchBy,
    });
  }

  currentPageChange(page: number) {
    this.mergeQueryParams({
      page,
    });
  }

  pageSizeChange(pageSize: number) {
    this.mergeQueryParams({
      page: 1,
      page_size: pageSize,
    });
  }

  sortByChanged(event: { active: string; direction: string }) {
    this.mergeQueryParams({
      sort: event.active,
      direction: event.direction,
    });
  }

  // appFilterChanged(app: string) {
  //   this.mergeQueryParams({
  //     app,
  //     page: 1,
  //   });
  // }

  onHistoryDataChange(change: { total: number; histories: PipelineHistory[] }) {
    this.waitingCount = change.total || 0;
  }

  onPipelineStarted(pipeline: PipelineConfig) {
    this.router.navigate(['./', pipeline.name], { relativeTo: this.route });
  }

  modeSelect() {
    const category = this.route.snapshot.paramMap.get('category');
    const project = this.route.snapshot.paramMap.get('project');
    if (category !== 'all') {
      return this.router.navigate(
        ['/workspace', project, 'pipelines', category, 'create'],
        {
          queryParams: {
            method: PipelineKind.Template,
          },
        },
      );
    }

    this.featureGate
      .isEnabled('devops-pipeline-graph')
      .pipe(take(1))
      .subscribe(enabled => {
        this.dialogRef = this.dialog.open(ModeSelectComponent, {
          size: enabled ? DialogSize.Large : DialogSize.Big,
          data: {
            namespace: this.route.snapshot.paramMap.get('project'),
            category: category,
          },
        });
      });
  }

  ngOnDestroy() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  private mergeQueryParams(queryParams: Params) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
