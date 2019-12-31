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
import {
  CodeQualityApiService,
  CodeQualityService,
  Secret,
  SecretApiService,
  SecretType,
  groupByScope,
} from '@app/api';
import { BindingKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import debug from 'debug';
import { Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';

const log = debug('code-quality:binding-create-page');

@Component({
  templateUrl: 'code-quality-binding-create-page.component.html',
  styleUrls: ['code-quality-binding-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCodeQualityBindingCreatePageComponent {
  namespace$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('name')),
    publishReplay(1),
    refCount(),
  );

  service$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('service')),
    publishReplay(1),
    refCount(),
  );

  private readonly secretsUpdated$$ = new Subject<void>();

  secrets$ = combineLatest(
    this.namespace$,
    this.secretsUpdated$$.pipe(startWith(null)),
  ).pipe(
    switchMap(([namespace]) => this.secretApi.find(null, namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  model = {
    name: '',
    secret: '',
    description: '',
  };

  @ViewChild('form', { static: true })
  form: NgForm;

  loading = false;

  nameRule = TOOLCHAIN_BINDING_NAME;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
    private readonly codeQualityApi: CodeQualityApiService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly location: Location,
  ) {}

  addSecret() {
    const service = this.route.snapshot.paramMap.get('service');

    return this.codeQualityApi.services
      .get(service)
      .pipe(
        catchError(() => of(null as CodeQualityService)),
        switchMap(data => {
          if (!data) {
            return this.secretActions.create([SecretType.BasicAuth], '');
          }

          const { toolKind, toolType } = data;

          return this.secretActions.createForToolChain(
            toolKind,
            toolType,
            SecretType.BasicAuth,
          );
        }),
      )
      .subscribe(result => {
        if (result) {
          this.model.secret = this.secretToValue(result);
          this.secretsUpdated$$.next();
        }
      });
  }

  onSubmit() {
    this.form.onSubmit(null);

    log('form value', this.form.value);

    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const namespace = this.route.snapshot.paramMap.get('name');
    const service = this.route.snapshot.paramMap.get('service');
    const name = this.model.name;
    this.codeQualityApi.bindings
      .create({
        ...this.model,
        service,
        namespace,
      })
      .subscribe(
        () => {
          this.message.success(this.translate.get('project.bind_account_succ'));

          this.router.navigate([
            '/admin/projects',
            namespace,
            BindingKind.CodeQuality,
            name,
          ]);
        },
        (error: any) => {
          this.notification.error({
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
