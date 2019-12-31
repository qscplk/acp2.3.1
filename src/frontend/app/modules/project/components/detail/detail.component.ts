import { Sort } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Project } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { PermissionService } from '@app/services';
import { Subject, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-project-detail',
  templateUrl: 'detail.component.html',
  styleUrls: ['detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  @Input()
  get data() {
    return this._data;
  }
  set data(value: Project) {
    this._data = value;
    this.projectChange$.next((this._data && this._data.name) || '');
  }
  private _data: Project = null;

  @Input()
  disabled: boolean;

  @Input()
  forbiddenSidecarInjectNamespaces: string[];

  @Output()
  updated = new EventEmitter();

  activeTab$ = this.activatedRoute.queryParamMap.pipe(
    map(query => query.get('tab') || 0),
    publishReplay(1),
    refCount(),
  );

  private projectChange$ = new Subject<string>();

  memberCreatable$ = this.projectChange$.pipe(
    distinctUntilChanged(),
    switchMap(project =>
      this.permission.canI('create', project, RESOURCE_TYPES.ROLE_BINDING).pipe(
        catchError(() => of(false)),
        startWith(false),
      ),
    ),
    distinctUntilChanged(),
    publishReplay(1),
    refCount(),
  );

  memberSort: Sort;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private permission: PermissionService,
  ) {}

  changeTab(tab: string) {
    this.router.navigate([], {
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  statusUpdate() {
    this.updated.emit();
  }

  onMemberSort(sort: Sort) {
    this.memberSort = sort;
  }
}
