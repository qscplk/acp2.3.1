import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Project, ProjectApiService } from '@app/api';
import { Subject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListPageComponent {
  params$ = this.route.queryParamMap.pipe(
    map(mapParams),
    tap(params => {
      this.searchBy =
        params.searchBy === 'displayName' ? 'display_name' : 'name';
      this.keywords = params.keywords;
    }),
    publishReplay(1),
    refCount(),
  );

  pageIndex$ = this.params$.pipe(
    map(params => params.pageIndex),
    distinctUntilChanged(),
    publishReplay(1),
    refCount(),
  );

  pageSize$ = this.params$.pipe(
    map(params => params.pageSize),
    distinctUntilChanged(),
    publishReplay(1),
    refCount(),
  );

  refresh$ = new Subject<void>();

  searchBy = 'name';

  keywords = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectApi: ProjectApiService,
  ) {}

  itemRoute = (item: Project) => ['./', item.name];

  fetchProjects = (params: {
    searchBy: string;
    keywords: string;
    pageIndex: number;
    pageSize: number;
    sort: string;
    direction: string;
  }) =>
    this.projectApi.find(
      params.keywords && {
        fieldSelector: `metadata.name=${params.keywords}`,
      },
    );

  search(keywords: string) {
    const orignalParams = mapParams(this.route.snapshot.queryParamMap);

    if (
      orignalParams.keywords === keywords &&
      orignalParams.searchBy === this.searchBy
    ) {
      this.refresh$.next();
      return;
    }

    this.router.navigate([], {
      queryParams: {
        search_by: this.searchBy,
        keywords,
        page: null,
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  onSort({ sort, direction }: { sort: string; direction: string }) {
    this.router.navigate([], {
      queryParams: {
        sort,
        direction,
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  onPageChange({
    pageIndex,
    pageSize,
  }: {
    pageIndex: number;
    pageSize: number;
  }) {
    this.router.navigate([], {
      queryParams: {
        page: pageIndex + 1,
        page_size: pageSize,
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }
}

function mapParams(paramMap: ParamMap) {
  return {
    searchBy:
      paramMap.get('search_by') === 'display_name' ? 'displayName' : 'name',
    keywords: paramMap.get('keywords') || '',
    pageIndex: +(paramMap.get('page') || '1') - 1,
    pageSize: +(paramMap.get('page_size') || 20),
    sort: paramMap.get('sort') || 'name',
    direction: paramMap.get('direction') || 'asc',
  };
}
