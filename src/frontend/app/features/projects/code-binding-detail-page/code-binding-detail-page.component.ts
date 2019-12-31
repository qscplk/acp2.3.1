import { AsyncDataLoader, publishRef } from '@alauda/common-snippet';
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CodeBinding } from '@app/api';
import { CodeApiService } from '@app/api/code/code-api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  templateUrl: 'code-binding-detail-page.component.html',
  styleUrls: ['code-binding-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCodeBindingDetailPageComponent {
  params$ = this.route.paramMap.pipe(
    map(paramMap => ({
      name: paramMap.get('codeBindingName'),
      namespace: paramMap.get('name'),
    })),
    publishRef(),
  );

  dataLoader = new AsyncDataLoader({
    params$: this.params$,
    fetcher: params => this.fetcher(params),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly codeApi: CodeApiService,
    private readonly location: Location,
  ) {}

  fetcher = (params: any): Observable<CodeBinding> => {
    return this.codeApi.getBinding(params.namespace, params.name);
  };

  back() {
    this.location.back();
  }

  refresh() {
    this.dataLoader.reload();
  }
}
