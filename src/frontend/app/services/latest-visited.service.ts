import { NamespaceIdentity } from '@alauda/common-snippet';
import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { isEqual } from 'lodash-es';
import pathToRegexp from 'path-to-regexp';
import { Observable, Subject, merge } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  publishReplay,
  refCount,
} from 'rxjs/operators';

const routeRegexp = pathToRegexp(
  '/workspace/:project/clusters/:cluster/namespaces/:namespace/:menu',
  null,
  { end: false },
);

@Injectable({ providedIn: 'root' })
export class LatestVisitedService {
  private readonly _namespace$ = new Subject<NamespaceIdentity>();

  namespace$: Observable<any> = merge(
    this._namespace$,
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => routeRegexp.exec(event.url)),
      filter(matching => !!matching),
      map(([, , cluster, name]) => ({
        cluster,
        name,
      })),
    ),
  ).pipe(distinctUntilChanged(isEqual), publishReplay(1), refCount());

  constructor(private readonly router: Router) {
    this.namespace$.subscribe();
  }

  clearNamespace() {
    this._namespace$.next(null);
  }

  setNamespace(namespace: NamespaceIdentity) {
    if (!namespace) {
      this._namespace$.next(null);
      return;
    }

    const url = this.router.url.split('?')[0];
    const matching = routeRegexp.exec(url);

    if (!matching) {
      this._namespace$.next(namespace);
      return;
    }

    const [, project, , , menu] = matching;

    this.router.navigate([
      '/workspace',
      project,
      'clusters',
      namespace.cluster,
      'namespaces',
      namespace.name,
      menu,
    ]);
  }
}
