import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { PipelineApiService, PipelineTemplate } from '@app/api';
import { ListResult } from '@app/api/api.types';
import { filterBy, getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { get } from 'lodash-es';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-template-list-container',
  templateUrl: './list-container.component.html',
  styleUrls: ['./list-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateListContainerComponent implements OnInit {
  type = 'custom';
  searchKey: string;
  params$ = new BehaviorSubject({
    pageIndex: 0,
    itemsPerPage: 10,
    search: '',
  });

  clusterTemplateCount = 0;
  templateCount = 0;
  pageSize = 10;
  @Input()
  project: string;

  constructor(
    private readonly pipelineApi: PipelineApiService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.getTemplateList().subscribe(
      () => {
        this.cdr.markForCheck();
      },
      () => {},
    );
    this.getClusterTemplateList().subscribe(
      () => {
        this.cdr.markForCheck();
      },
      () => {},
    );
  }

  fetchData = (params: {
    pageIndex: number;
    itemsPerPage: number;
    search: string;
  }) => {
    if (!params) {
      of();
    }
    if (this.type === 'official') {
      return this.getClusterTemplateList(params);
    } else {
      return this.getTemplateList(params);
    }
  };

  getClusterTemplateList(
    params?: any,
  ): Observable<ListResult<PipelineTemplate>> {
    return this.pipelineApi
      .clusterTemplateList(
        getQuery(
          pageBy(
            get(params, 'pageIndex', 0),
            get(params, 'itemsPerPage', this.pageSize),
          ),
          filterBy(
            this.translate.locale === 'en' ? 'displayEnName' : 'displayZhName',
            get(params, 'search', ''),
          ),
          filterBy('labels', ['latest:true', 'source:official']),
          sortBy('name', false),
        ),
      )
      .pipe(
        tap((ctemplate: ListResult<PipelineTemplate>) => {
          this.clusterTemplateCount = ctemplate.total;
        }),
      );
  }

  getTemplateList(params?: any): Observable<ListResult<PipelineTemplate>> {
    return this.pipelineApi
      .templateList(
        this.project,
        getQuery(
          pageBy(
            get(params, 'pageIndex', 0),
            get(params, 'itemsPerPage', this.pageSize),
          ),
          filterBy(
            this.translate.locale === 'en' ? 'displayEnName' : 'displayZhName',
            get(params, 'search', ''),
          ),
          filterBy('labels', ['latest:true', 'source:customer']),
          sortBy('name', false),
        ),
      )
      .pipe(
        tap((template: ListResult<PipelineTemplate>) => {
          this.templateCount = template.total;
        }),
      );
  }

  search(event: string) {
    this.searchKey = event;
    this.refetchList();
  }

  typeChange(type: string) {
    this.type = type;
    this.refetchList();
  }

  syncChange() {
    this.type = 'custom';
    this.refetchList();
  }

  refetchList() {
    this.params$.next({
      search: this.searchKey,
      pageIndex: 0,
      itemsPerPage: this.pageSize,
    });
  }

  currentPageChange(page: number) {
    this.params$.next(
      Object.assign({}, this.params$.getValue(), {
        pageIndex: page - 1,
      }),
    );
  }

  pageSizeChange(pageSize: number) {
    this.pageSize = pageSize;
    this.params$.next(
      Object.assign({}, this.params$.getValue(), {
        pageIndex: 0,
        itemsPerPage: pageSize,
      }),
    );
  }
}
