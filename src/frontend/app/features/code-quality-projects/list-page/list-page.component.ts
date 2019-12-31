import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityProjectListPageComponent implements OnDestroy {
  namespace$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('project')),
    publishReplay(1),
    refCount(),
  );

  queryParams$ = this.route.queryParamMap.pipe(
    map(paramMap => ({
      keywords: paramMap.get('keywords') || '',
      sort: paramMap.get('sort') || 'date',
    })),
    publishReplay(1),
    refCount(),
  );

  private keywordsChange$ = new Subject<string>();

  private subscriptions: Subscription[] = [];

  debouncedKeywords$ = this.keywordsChange$.pipe(
    debounceTime(500),
    publishReplay(1),
    refCount(),
  );

  constructor(private route: ActivatedRoute, private router: Router) {
    this.subscriptions.push(
      this.debouncedKeywords$.subscribe(keywords => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { keywords },
          queryParamsHandling: 'merge',
        });
      }),
    );
  }

  onSortChange(sort: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort },
      queryParamsHandling: 'merge',
    });
  }

  onKeywordsChange(keywords: string) {
    this.keywordsChange$.next(keywords);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
