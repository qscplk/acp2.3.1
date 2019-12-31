import { TranslateService } from '@alauda/common-snippet';
import { DialogService, MessageService } from '@alauda/ui';
import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { ApplicationIdentity } from '@app/api';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

import { ApplicationDeleteDialogComponent } from '../../../modules/application';

@Component({
  templateUrl: 'application-create.component.html',
  styleUrls: ['application-create.component.scss'],
})
export class ApplicationCreateComponent {
  params$ = this.route.paramMap.pipe(
    map(params => ({
      cluster: params.get('cluster'),
      namespace: params.get('namespace'),
      project: params.get('project'),
    })),
  );

  method$ = selectParam(this.route.queryParamMap, 'method', 'yaml');
  template$ = selectParam(this.route.queryParamMap, 'template');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly dialog: DialogService,
  ) {}

  onCreated(name: string) {
    this.message.success({
      content: this.translate.get(
        'application.application_name_create_success',
        { name: name },
      ),
    });
    this.router.navigate(['../', name], {
      relativeTo: this.route,
    });
  }

  onCanceled() {
    this.router.navigate(['../'], {
      relativeTo: this.route,
    });
  }

  onDetail(applicationName: string) {
    this.router.navigate(['../', applicationName], {
      relativeTo: this.route,
    });
  }

  onDelete(applicationIdentity: ApplicationIdentity) {
    const dialogRef = this.dialog.open(ApplicationDeleteDialogComponent, {
      data: {
        params: applicationIdentity,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.message.success({
          content: this.translate.get(
            'application.application_name_delete_success',
            {
              name: applicationIdentity.name,
            },
          ),
        });
        this.onCanceled();
      }
    });
  }
}

function selectParam(
  paramMap$: Observable<ParamMap>,
  name: string,
  defaultValue = '',
) {
  return paramMap$.pipe(
    map(paramMap => paramMap.get(name) || defaultValue),
    distinctUntilChanged(),
    shareReplay(1),
  );
}
