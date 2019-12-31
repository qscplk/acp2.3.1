import { TranslateService } from '@alauda/common-snippet';
import { NotificationService } from '@alauda/ui';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  MultiBranchFilters,
  PipelineApiService,
  PipelineHistory,
  PipelineParams,
} from '@app/api';
import { filterBy, getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { isEmpty } from 'lodash-es';
import { Subject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-histories',
  templateUrl: './histories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoriesComponent implements AfterViewInit, OnChanges {
  historySearchKey = '';
  historyPageSize = 10;
  historyPageIndex = 0;
  historySortBy = 'creationTimestamp';
  historyDesc = true;
  pullInTime = 5000;
  histories: PipelineHistory[];
  historyParams$: Subject<{
    filterBy?: string;
    sortBy?: string;
    page?: string;
    itemsPerPage?: string;
  }> = new Subject();

  @Input()
  project: string;

  @Input()
  name: string;

  @Input()
  filterByStatus: string;

  @Input()
  showWaiting: boolean;

  @Input()
  hideTitle: false;

  @Input()
  permissions: {
    pipelines: {
      create: boolean;
      delete: boolean;
    };
    pipelinesInput: {
      create: boolean;
    };
    pipelineLogs: {
      get: boolean;
    };
  };

  @Output()
  dataChange = new EventEmitter<{
    total: number;
    histories: PipelineHistory[];
  }>();

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

  @Output()
  branchChange = new EventEmitter<{
    type: MultiBranchFilters;
    name: string;
  }>();

  params: null;

  constructor(
    private readonly pipelineApi: PipelineApiService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.activeBranch && !changes.activeBranch.firstChange) {
      this.historyRefresh();
    }
  }

  fetchData = (params: any) => {
    if (!params) {
      return of({ total: 0, histories: [] });
    }
    return this.pipelineApi.getPipelineHistories(this.project, params).pipe(
      tap(data => {
        this.dataChange.emit(data);
      }),
      map(historiesList => {
        historiesList.histories = historiesList.histories.map(
          this.mapPipelineHistories,
        );
        return historiesList;
      }),
      catchError(err => {
        this.pullInTime = 0;
        if (err.status === 403) {
          this.notification.error({
            title: this.translate.get('errorType'),
            content: err.error.error || err.error.message,
          });
        }
        throw err;
      }),
    );
  };

  onBranchChange(branch: { type: MultiBranchFilters; name: string }) {
    this.branchChange.emit(branch);
  }

  historyParamsChanged(params: {
    pageIndex?: number;
    pageSize?: number;
    searchKey?: string;
    active?: string;
    desc?: boolean;
  }) {
    if (isEmpty(params)) {
      this.historyRefresh();
    } else {
      const { pageIndex, pageSize, searchKey, active, desc } = params;
      const pageSizeChanged = this.historyPageSize !== pageSize;
      this.historyPageIndex =
        pageIndex === undefined ? this.historyPageIndex : pageIndex;
      this.historyPageSize = pageSize || this.historyPageSize;
      this.historySearchKey =
        searchKey === undefined ? this.historySearchKey : searchKey;
      this.historySortBy = active === undefined ? this.historySortBy : active;
      this.historyDesc = desc === undefined ? this.historyDesc : desc;
      this.historyRefresh(pageSizeChanged);
    }
  }

  historyRefresh(reset = false) {
    if (reset) {
      this.historySearchKey = '';
      this.historyPageIndex = 0;
      this.historyDesc = true;
      this.historySortBy = 'creationTimestamp';
    }
    this.historyParams$.next(this.queryBuilder());
  }

  private queryBuilder(): PipelineParams {
    return getQuery(
      ...(this.activeBranch
        ? [
            filterBy('multiBranchName', this.activeBranch.name),
            filterBy('multiBranchCategory', this.activeBranch.type),
          ]
        : []),
      this.filterByStatus
        ? filterBy('pipelineStatus', this.filterByStatus)
        : filterBy('labels', `pipelineConfig:${this.name}`),
      filterBy('name', this.historySearchKey),
      sortBy(this.historySortBy, this.historyDesc),
      pageBy(this.historyPageIndex, this.historyPageSize),
    );
  }

  private mapPipelineHistories(history: PipelineHistory) {
    return {
      ...history.status,
      ...history,
      duration:
        new Date(history.status.finishedAt).getTime() -
        new Date(history.status.startedAt).getTime(),
    };
  }

  ngAfterViewInit() {
    this.historyParams$.next(this.queryBuilder());
  }
}
