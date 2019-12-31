import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CodeApiService } from '@app/api/code/code-api.service';
import { CodeRepositoriesFindParams } from '@app/api/code/code-api.types';
import { getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { isEqual } from 'lodash-es';
import { BehaviorSubject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
} from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeRepositoryListPageComponent {
  params$ = combineLatest([
    this.route.parent.parent.paramMap,
    this.route.queryParamMap,
  ]).pipe(
    map(([params, queryParams]) => ({
      pageIndex: +(queryParams.get('page') || '1') - 1,
      itemsPerPage: +(queryParams.get('page_size') || '20'),
      project: params.get('project'),
      name: queryParams.get('keywords') || '',
    })),
    distinctUntilChanged(isEqual),
    publishReplay(1),
    refCount(),
  );

  pageIndex$ = this.params$.pipe(
    map(params => params.pageIndex),
    publishReplay(1),
    refCount(),
  );

  itemsPerPage$ = this.params$.pipe(
    map(params => params.itemsPerPage),
    publishReplay(1),
    refCount(),
  );

  reposFilter$$ = new BehaviorSubject<string>('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: CodeApiService,
  ) {}

  fetchCodeRepositories = (params: CodeRepositoriesFindParams) =>
    combineLatest(
      this.reposFilter$$,
      this.api.findCodeRepositories(
        params.project,
        getQuery(
          pageBy(params.pageIndex, params.itemsPerPage),
          sortBy('name', false),
        ),
      ),
    ).pipe(
      map(([keyword, repos]) => ({
        ...repos,
        items: repos.items.filter(item => item.fullName.includes(keyword)),
      })),
    );

  search(keywords: string) {
    this.router.navigate([], {
      queryParams: { keywords, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  currentPageChange(event: number) {
    this.router.navigate([], {
      queryParams: { page: event },
      queryParamsHandling: 'merge',
    });
  }
  pageSizeChange(event: number) {
    this.router.navigate([], {
      queryParams: { page: 1, page_size: event },
      queryParamsHandling: 'merge',
    });
  }
}
