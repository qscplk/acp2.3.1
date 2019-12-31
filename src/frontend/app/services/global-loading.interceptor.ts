import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UiStateService } from '@app/services/ui-state.service';
import { Observable, Subject, merge } from 'rxjs';
import { map, publishReplay, refCount, scan, startWith } from 'rxjs/operators';

@Injectable()
export class GlobalLoadingInterceptor implements HttpInterceptor {
  private _startRequest$ = new Subject<HttpRequest<any>>();
  private _stopRequest$ = new Subject<HttpRequest<any>>();

  loading$ = merge(
    this._startRequest$.pipe(map(() => 1)),
    this._stopRequest$.pipe(map(() => -1)),
  ).pipe(
    scan((state, value) => state + value, 0),
    startWith(0),
    map(count => count > 0),
    publishReplay(1),
    refCount(),
  );

  constructor(uiState: UiStateService) {
    this.loading$.subscribe(flag => uiState.setLoading(flag));
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    this._startRequest$.next(req);

    return new Observable(observer => {
      const sub = next
        .handle(req)
        .subscribe(
          res => observer.next(res),
          res => observer.error(res),
          () => observer.complete(),
        );

      return () => {
        this._stopRequest$.next(req);
        sub.unsubscribe();
      };
    });
  }
}
