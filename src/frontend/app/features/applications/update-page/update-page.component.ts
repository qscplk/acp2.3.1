import { TranslateService } from '@alauda/common-snippet';
import { MessageService } from '@alauda/ui';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationApiService, ApplicationIdentity } from '@app/api';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'update-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationUpdatePageComponent {
  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      project: paramMap.get('project'),
      namespace: paramMap.get('namespace'),
      cluster: paramMap.get('cluster'),
      name: paramMap.get('name'),
    })),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
  ) {}

  onCanceled() {
    this.router.navigate(['../'], {
      relativeTo: this.route,
    });
  }

  onUpdated(name: string) {
    this.message.success({
      content: this.translate.get(
        'application.application_name_update_success',
        { name: name },
      ),
    });
    this.router.navigate(['../'], {
      relativeTo: this.route,
    });
  }

  fetchApplication = (identity: ApplicationIdentity) => this.api.get(identity);
}
