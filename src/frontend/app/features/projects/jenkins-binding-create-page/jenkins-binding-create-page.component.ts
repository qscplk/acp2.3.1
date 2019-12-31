import { TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Secret, SecretApiService, SecretType, groupByScope } from '@app/api';
import { JenkinsApiService } from '@app/api/jenkins/jenkins-api.service';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { Subject, combineLatest } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';

@Component({
  templateUrl: 'jenkins-binding-create-page.component.html',
  styleUrls: ['jenkins-binding-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectJenkinsBindingCreatePageComponent {
  secretsUpdated$$ = new Subject<void>();
  project$ = this.activatedRoute.paramMap.pipe(
    map(params => params.get('name')),
    publishReplay(1),
    refCount(),
  );

  service$ = this.activatedRoute.paramMap.pipe(
    map(params => params.get('service')),
    publishReplay(1),
    refCount(),
  );

  secrets$ = combineLatest(
    this.project$,
    this.secretsUpdated$$.pipe(startWith(null)),
  ).pipe(
    switchMap(([namespace]) => this.secretApi.find(null, namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  formData = {
    name: '',
    secret: '',
    description: '',
  };

  @ViewChild('form', { static: true })
  form: NgForm;

  loading = false;
  nameRule = TOOLCHAIN_BINDING_NAME;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly secretApi: SecretApiService,
    private readonly jenkinsApi: JenkinsApiService,
    private readonly secretActions: SecretActions,
    private readonly router: Router,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly location: Location,
  ) {}

  addSecret() {
    this.secretActions
      .createForToolChain(
        ToolKind.Jenkins,
        ToolKind.Jenkins,
        SecretType.BasicAuth,
      )
      .subscribe(result => {
        if (result) {
          this.formData.secret = this.secretToValue(result);
          this.secretsUpdated$$.next();
        }
      });
  }

  onSubmit() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const namespace = this.activatedRoute.snapshot.paramMap.get('name');
    const service = this.activatedRoute.snapshot.paramMap.get('service');
    const name = this.formData.name;
    this.jenkinsApi
      .createBinding({
        ...this.formData,
        service,
        namespace,
      })
      .subscribe(
        () => {
          this.message.success(this.translate.get('project.bind_account_succ'));
          const next = this.activatedRoute.snapshot.queryParamMap.get('next');
          if (next) {
            this.router.navigateByUrl(decodeURI(next));
          } else {
            this.router.navigate([
              '/admin/projects',
              namespace,
              'jenkinsbinding',
              name,
            ]);
          }
        },
        error => {
          this.notifaction.error({
            title: this.translate.get('project.bind_account_failed'),
            content: error.error.error || error.error.message,
          });
          this.loading = false;
          this.cdr.markForCheck();
        },
      );
  }

  cancel() {
    this.location.back();
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }
}
