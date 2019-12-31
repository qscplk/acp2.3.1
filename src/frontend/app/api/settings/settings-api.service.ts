import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { map, publishReplay, refCount, switchMap, take } from 'rxjs/operators';

@Injectable()
export class SettingsApiService implements OnDestroy {
  private request$ = new Subject<void>();
  private settings$ = this.request$.pipe(
    take(1),
    switchMap(() => this.http.get('{{API_GATEWAY}}/devops/api/v1/settings')),
    publishReplay(1),
    refCount(),
  );

  private subscription: Subscription = null;

  constructor(private http: HttpClient) {
    this.subscription = this.settings$.subscribe();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getSecretTips(type: string) {
    return this.select(settings => settings.secretTips[type]);
  }

  private select<T>(expression: (settings: any) => T): Observable<T> {
    this.request$.next();
    return this.settings$.pipe(
      map(expression),
      publishReplay(1),
      refCount(),
    );
  }
}
