import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import { camelCase, snakeCase } from 'lodash-es';
import { BehaviorSubject, NEVER, combineLatest, merge, of } from 'rxjs';
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

  refetch$$ = new BehaviorSubject<void>(null);
  toolType$ = this.activatedRoute.paramMap.pipe(
    map(param => param.get('toolType')),
    map(snakeCase),
    publishReplay(1),
    refCount(),
  );

  services$ = combineLatest([this.toolType$, this.refetch$$]).pipe(
    map(([type]) => camelCase(type)),
    tap(() => {
      this.loading = true;
      this.error = null;
    }),
    switchMap(type =>
      merge(
        of([]),
        this.toolChainApi.findToolServices(type).pipe(
          catchError(err => {
            this.loading = false;
            this.error = err;
            this.cdr.markForCheck();
            return NEVER;
          }),
          tap(data => {
            if (data && data.errors && data.errors.length) {
              this.error = data.errors;
            }
            this.loading = false;
          }),
          map(data => data.items),
        ),
      ),
    ),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private activatedRoute: ActivatedRoute,
    private toolChainApi: ToolChainApiService,
    private cdr: ChangeDetectorRef,
  ) {}
}
