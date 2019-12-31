import {
  ImagePullDialogComponent,
  ImageRepositoryValue,
} from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  Component,
  Injector,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApplicationApiService,
  ApplicationsFindParams,
  SecretType,
} from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { LocalImageSelectorDataContext } from '@app/modules/pipeline/components/forms/parameters/local-image-selector-data-context';
import { WorkloadSelectDialogComponent } from '@app/modules/application/components/workload-select-dialog/workload-select-dialog.component';
import { PermissionService } from '@app/services';
import { isEqual } from 'lodash-es';
import { combineLatest, of, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'application-list.component.html',
  styleUrls: ['application-list.component.scss'],
})
export class ApplicationListComponent implements OnInit, OnDestroy {
  namespace: string;
  cluster: string;

  refresh$ = new Subject<void>();

  params$ = combineLatest(this.route.paramMap, this.route.queryParamMap).pipe(
    tap(([params]) => {
      this.cluster = params.get('cluster');
      this.namespace = params.get('namespace');
    }),
    map(([params, queryParams]) => ({
      pageIndex: +(queryParams.get('page') || '1') - 1,
      itemsPerPage: +(queryParams.get('page_size') || '20'),
      cluster: params.get('cluster'),
      namespace: params.get('namespace'),
      project: params.get('project'),
      name: queryParams.get('keywords') || '',
    })),
    distinctUntilChanged(isEqual),
    publishReplay(1),
    refCount(),
  );

  keywords$ = this.params$.pipe(
    map(params => params.name),
    publishReplay(1),
    refCount(),
  );

  pageIndex$ = this.params$.pipe(
    map(params => params.pageIndex),
    publishReplay(1),
    refCount(),
  );

  itemsPerpage$ = this.params$.pipe(
    map(params => params.itemsPerPage),
    publishReplay(1),
    refCount(),
  );

  creatable$ = this.params$.pipe(
    switchMap(params =>
      this.permission
        .canI(
          'create',
          params.namespace,
          RESOURCE_TYPES.APPLICATIONS,
          '',
          params.cluster,
        )
        .pipe(
          catchError(() => of(false)),
          startWith(false),
        ),
    ),
    publishReplay(1),
    refCount(),
  );

  @ViewChild('createMethodDialog', { static: true })
  createMethodDialog: TemplateRef<any>;

  useTemplate = false;

  imageSelectorDataContext = new LocalImageSelectorDataContext(this.injector);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: DialogService,
    private api: ApplicationApiService,
    private permission: PermissionService,
    private injector: Injector,
  ) {}

  ngOnInit() {
    this.params$.subscribe(({ project, cluster, namespace }) => {
      this.imageSelectorDataContext.crossCluster = true;
      this.imageSelectorDataContext.params = {
        project,
        cluster,
        namespace,
        template: null,
        secretType: SecretType.DockerConfig,
      };
    });
  }

  ngOnDestroy() {
    this.dialog.closeAll();
  }

  trackByFn(index: number) {
    return index;
  }

  selectCreateMethod() {
    this.dialog.open(this.createMethodDialog, { size: DialogSize.Large });
  }

  createByImage() {
    const dialogRef = this.dialog.open(ImagePullDialogComponent, {
      size: DialogSize.Large,
      data: { context: this.imageSelectorDataContext },
    });
    dialogRef.afterClosed().subscribe((result: ImageRepositoryValue) => {
      if (result) {
        const params = {
          repository_name: result.repositoryPath,
          repository_address: result.repositoryPath,
          secret: result.secretName,
          tag: result.tag,
        };
        const queryParams = {
          method: 'image',
          ...params,
        };
        this.router.navigate(['./', 'create'], {
          relativeTo: this.route,
          queryParams,
        });
      }
    });
  }

  createByWorkload() {
    const dialogRef = this.dialog.open(WorkloadSelectDialogComponent, {
      size: DialogSize.Large,
      data: {
        cluster: this.cluster,
        namespace: this.namespace,
      },
    });
    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        this.refresh$.next();
      }
    });
  }

  toggleTemplate() {
    this.useTemplate = !this.useTemplate;
  }

  fetchApplications = (params: ApplicationsFindParams) =>
    this.api.findApplications(params);

  search(keywords: string) {
    this.router.navigate([], {
      queryParams: { keywords, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  pageChange(event: { pageIndex: number; pageSize: number }) {
    this.router.navigate([], {
      queryParams: { page: event.pageIndex + 1, page_size: event.pageSize },
      queryParamsHandling: 'merge',
    });
  }
}
