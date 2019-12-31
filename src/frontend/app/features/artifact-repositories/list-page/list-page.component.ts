import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { BehaviorSubject, NEVER, combineLatest } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPageComponent {
  loading = false;
  error: any;

  project$ = this.activeatedRoute.paramMap.pipe(
    map(param => param.get('project')),
  );

  repositoriesFilter$$ = new BehaviorSubject<string>('');
  refetch$$ = new BehaviorSubject(null);

  repositories$ = combineLatest(this.project$, this.refetch$$).pipe(
    tap(() => {
      this.loading = true;
      this.error = null;
    }),
    switchMap(([project]) =>
      this.registryApi.findRepositoriesByProject(project, null).pipe(
        catchError(err => {
          this.loading = false;
          this.error = err;
          this.cdr.markForCheck();
          return NEVER;
        }),
      ),
    ),
    tap(data => {
      if (data.errors.length) {
        this.error = data.errors;
      }
      this.loading = false;
    }),
    map(list => list.items),
    publishReplay(1),
    refCount(),
  );

  filteredRepositories$ = combineLatest(
    this.repositories$,
    this.repositoriesFilter$$,
  ).pipe(
    map(([items, keyword]) =>
      items.filter(item => item.image.includes(keyword)),
    ),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private activeatedRoute: ActivatedRoute,
    private registryApi: RegistryApiService,
    private cdr: ChangeDetectorRef,
  ) {}
}
