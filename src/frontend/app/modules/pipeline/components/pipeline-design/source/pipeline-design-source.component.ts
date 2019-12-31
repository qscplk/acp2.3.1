import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CodeApiService, CodeRepositoryModel } from '@app/api';
import { Subject, Subscription, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
} from 'rxjs/operators';

export interface RepositoryInfo {
  repo: string;
  branch: string;
  path: string;
}

@Component({
  selector: 'alo-pipeline-design-source',
  templateUrl: './pipeline-design-source.component.html',
  styleUrls: ['./pipeline-design-source.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineDesignSourceComponent implements OnChanges, OnDestroy {
  @Input()
  type: string;

  @Input()
  source: { repo: CodeRepositoryModel; path: string; branch: string };

  @Input()
  namespace: string;

  private subscriptions: Subscription[] = [];

  private sourceChange$ = new Subject<{
    repo: CodeRepositoryModel;
    path: string;
    branch: string;
  }>();

  display$ = this.sourceChange$.pipe(
    switchMap(source => {
      if (!source || !source.repo) {
        return of(null);
      }

      if (source.repo.kind === 'buildin') {
        return this.codeApi
          .getCodeRepository(this.namespace, source.repo.bindingRepository)
          .pipe(
            map(repo => ({
              icon: repo.type.toLocaleLowerCase(),
              text: repo.httpURL,
            })),
            catchError(() =>
              of({
                icon: 'git',
                text: source.repo.bindingRepository,
              }),
            ),
          );
      } else {
        return of({
          icon: source.repo.kind,
          text: source.repo.repo,
        });
      }
    }),
    publishReplay(1),
    refCount(),
  );

  constructor(private codeApi: CodeApiService) {
    this.subscriptions.push(this.display$.subscribe());
  }

  ngOnChanges({ source }: SimpleChanges) {
    if (source && source.currentValue) {
      this.sourceChange$.next(source.currentValue);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
