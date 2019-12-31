import {
  CommonLayoutStoreService,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
} from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Project, ProjectApiService } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { UiStateService } from '@app/services';
import { DEFAULT_TRANSLATES } from '@app/shared/components/no-data';
import { Subject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
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
  onDestroy$ = new Subject<void>();

  searchBy = 'name';

  keywords = '';

  showLoadingBar$ = this.uiState.showLoadingBar$;

  allowCreateProject$ = this.k8sPermission.isAllowed({
    type: RESOURCE_TYPES.VIEWS,
    name: 'projectview',
    action: K8sResourceAction.GET,
  });

  showAdminTips$ = combineLatest(
    this.allowCreateProject$,
    this.params$,
    (allowed, { keywords }) => allowed && !keywords,
  ).pipe(startWith(false));

  noDataTranslates = DEFAULT_TRANSLATES;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly projectApi: ProjectApiService,
    private readonly uiState: UiStateService,
    private readonly k8sPermission: K8sPermissionService,
    private readonly layoutStore: CommonLayoutStoreService,
    private readonly translate: TranslateService,
    private readonly title: Title,
  ) {}

  ngOnInit(): void {
    this.translate.locale$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.title.setTitle(this.translate.get('project'));
    });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
  }

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

  navigateToProject() {
    this.layoutStore
      .selectProductByName('console-platform')
      .subscribe((product: any) => {
        if (product) {
          window.open(`${product.url}#/home`, '_blank');
        }
      });
  }

  projectRoute = (item: Project) => ['/workspace', item.name];
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
