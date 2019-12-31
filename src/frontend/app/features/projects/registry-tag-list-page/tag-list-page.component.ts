import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import {
  BehaviorSubject,
  NEVER,
  combineLatest,
  forkJoin,
  interval,
  merge,
  of,
} from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
  switchMapTo,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'tag-list-page.component.html',
  styleUrls: ['tag-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagListPageComponent {
  loading = false;
  error: any;

  namespace$ = this.activatedRoute.paramMap.pipe(
    map(param => param.get('name')),
  );
  bindingName$ = this.activatedRoute.paramMap.pipe(
    map(param => param.get('bindingName')),
  );
  repoName$ = this.activatedRoute.paramMap.pipe(
    map(param => param.get('repoName')),
  );

  keyword$$ = new BehaviorSubject<string>('');
  updated$$ = new BehaviorSubject<void>(null);

  repo$ = combineLatest(
    this.namespace$,
    this.repoName$,
    this.updated$$.pipe(switchMapTo(merge(of(null), interval(10000)))),
  ).pipe(
    tap(() => {
      this.loading = true;
      this.error = null;
    }),
    switchMap(([namespace, name]) =>
      forkJoin(
        this.registryApi.getRepository(namespace, name),
        this.registryApi.findRepositoryTags(namespace, name, null),
      ).pipe(
        map(([repository, tags]) => {
          return {
            ...repository,
            tags: tags.items,
          };
        }),
        catchError(err => {
          this.loading = false;
          this.error = err;
          this.cdr.markForCheck();
          return NEVER;
        }),
      ),
    ),
    tap(() => {
      this.loading = false;
    }),
    publishReplay(1),
    refCount(),
  );

  tags$ = combineLatest(
    this.repo$.pipe(map(repo => repo.tags)),
    this.keyword$$,
  ).pipe(
    map(([tags, keyword]) => tags.filter(tag => tag.name.includes(keyword))),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private registryApi: RegistryApiService,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}
}
