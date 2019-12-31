import {
  Directive,
  EmbeddedViewRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import debug from 'debug';
import { EMPTY, Observable, Subject, Subscription, merge, of } from 'rxjs';
import {
  catchError,
  delay,
  map,
  publish,
  refCount,
  scan,
  switchMap,
} from 'rxjs/operators';

const log = debug('async-data:');

export interface AsyncDataContext<TResult> {
  $implicit: TResult;
  error: any;
  loading: boolean;
  refetch: (ignoreError: boolean) => void;
}

@Directive({
  selector: '[aloAsyncData]',
  exportAs: 'aloAsyncData',
})
export class AsyncDataDirective<TParams, TResult>
  implements OnInit, OnChanges, OnDestroy {
  // tslint:disable-next-line:no-input-rename
  @Input('aloAsyncDataParams')
  params: TParams;

  // tslint:disable-next-line:no-input-rename
  @Input('aloAsyncDataHandler')
  handler: (params: TParams) => Observable<TResult>;

  // tslint:disable-next-line:no-input-rename
  @Input('aloAsyncDataPullIn')
  pullIn = 0; // pull in ms, 0 = never pull,

  // tslint:disable-next-line:no-input-rename
  @Input('aloAsyncDataNotification')
  notification: Observable<void> = null;

  private subscriptions: Subscription[] = [];
  private notificationSubscription: Subscription = null;

  private refetch$ = new Subject<boolean>();

  private result$ = this.refetch$.pipe(
    switchMap(ignoreError =>
      this.handler(this.params).pipe(
        map(result => ({ $implicit: result, error: null, ignoreError })),
        catchError(error => {
          log('fetch error', error);
          return of({
            $implicit: null,
            error,
            ignoreError,
          });
        }),
      ),
    ),
    publish(),
    refCount(),
  );

  private pull$ = this.result$.pipe(
    map(() => this.pullIn),
    switchMap(duration => (duration ? of(0).pipe(delay(duration)) : EMPTY)),
  );

  private state$: Observable<AsyncDataContext<TResult>> = merge(
    this.refetch$.pipe(
      map(() => (state: AsyncDataContext<TResult>): AsyncDataContext<
        TResult
      > => ({
        ...state,
        loading: true,
        error: null,
      })),
    ),
    this.result$.pipe(
      map(result => (state: AsyncDataContext<TResult>): AsyncDataContext<
        TResult
      > => ({
        ...state,
        $implicit:
          result.error && result.ignoreError
            ? state.$implicit
            : result.$implicit,
        error: result.error,
        loading: false,
      })),
    ),
  ).pipe(
    scan((state, action: any) => action(state), {
      $implicit: null,
      error: null,
      loading: false,
    }),
  );

  context: AsyncDataContext<TResult>;
  view: EmbeddedViewRef<any>;

  constructor(
    private container: ViewContainerRef,
    private template: TemplateRef<any>,
  ) {
    const stateSub = this.state$.subscribe(state => {
      if (!this.view) {
        this.context = Object.assign({}, state, { refetch: this.refetch });
        this.view = this.container.createEmbeddedView(
          this.template,
          this.context,
        );
      } else {
        Object.assign(this.context, state);
      }
      this.view.markForCheck();
    });
    const pullSub = this.pull$.subscribe(() => {
      this.refetch();
    });

    this.subscriptions.push(stateSub, pullSub);
  }

  ngOnInit() {
    this.refetch();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.params && !changes.params.firstChange) {
      this.refetch();
    }

    if (
      changes.pullIn &&
      changes.pullIn.previousValue === 0 &&
      changes.pullIn.currentValue > 0
    ) {
      this.refetch();
    }

    if (changes.notification) {
      if (this.notificationSubscription) {
        this.notificationSubscription.unsubscribe();
      }
      this.notificationSubscription = this.notification.subscribe(() => {
        this.refetch();
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }

  refetch = (ignoreError = false) => {
    this.refetch$.next(ignoreError);
  };
}
