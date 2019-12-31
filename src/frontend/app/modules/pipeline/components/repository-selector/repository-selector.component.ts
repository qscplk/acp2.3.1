import { TranslateService } from '@alauda/common-snippet';
import {
  DialogRef,
  DialogService,
  DialogSize,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  forwardRef,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALUE_ACCESSOR,
  NgForm,
  Validators,
} from '@angular/forms';
import {
  CodeApiService,
  CodeRepository,
  CodeRepositoryModel,
  PipelineKind,
  Secret,
  SecretApiService,
  SecretType,
} from '@app/api';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { filterBy, getQuery } from '@app/utils/query-builder';
import * as R from 'ramda';
import { Subject, Subscription, combineLatest, merge, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-repository-selector',
  templateUrl: './repository-selector.component.html',
  styleUrls: [
    './repository-selector.component.scss',
    '../../../tool-chain/shared-style/repository-option.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RepositorySelectorComponent),
      multi: true,
    },
    RepositorySelectorComponent,
  ],
})
export class RepositorySelectorComponent
  implements ControlValueAccessor, OnInit, OnDestroy {
  @Input()
  project: string;

  @Input()
  method: PipelineKind;

  @Input()
  onlyGit = false;

  @Output()
  contextChange = new EventEmitter<{
    secrets?: Secret[];
    codeRepositories?: CodeRepository[];
  }>();

  private fg: FormGroup;

  @ViewChild('form', { static: false })
  form: NgForm;

  @ViewChild('repo', { static: true })
  repoTemplate: TemplateRef<any>;

  private repoDialog: DialogRef<any>;

  private readonly subscriptions: Subscription[] = [];

  private readonly init$ = new Subject<void>();

  private readonly secretCreated$ = new Subject<Secret>();

  private readonly valueChanged$ = new Subject<CodeRepositoryModel>();

  secrets$ = merge(this.init$, this.secretCreated$).pipe(
    switchMap(() =>
      this.secretApi
        .find(
          getQuery(
            filterBy('secretType', `${SecretType.BasicAuth}:${SecretType.SSH}`),
          ),
          this.project,
        )
        .pipe(
          map(res => res.items || []),
          startWith(null),
          catchError(error => {
            this.notification.warning({
              title: this.translate.get('pipeline.secret_load_failed'),
              content: error.error.error || error.error.message,
            });

            return of([]);
          }),
        ),
    ),
    tap(items => {
      this.contextChange.next({
        secrets: items,
      });
    }),
    publishReplay(1),
    refCount(),
  );

  repositories$ = this.init$.pipe(
    switchMap(() =>
      this.codeApi.findCodeRepositories(this.project).pipe(
        map(res => res.items || []),
        startWith(null),
        catchError(error => {
          this.notification.warning({
            title: this.translate.get('pipeline.code_repositories_load_failed'),
            content: error.error.error || error.error.message,
          });
          return of([]);
        }),
      ),
    ),
    tap(items => {
      this.contextChange.next({
        codeRepositories: items,
      });
    }),
    publishReplay(1),
    refCount(),
  );

  display$ = combineLatest(
    this.valueChanged$,
    this.repositories$,
    (value, repositories) => {
      if (!value) {
        return null;
      }

      if (value.kind === 'buildin') {
        if (!repositories || !repositories.length) {
          return {
            icon: 'git',
            text: value.bindingRepository,
          };
        }

        const repo = repositories.find(
          item => item.name === value.bindingRepository,
        );

        if (!repo) {
          return {
            icon: 'git',
            text: value.bindingRepository,
          };
        }

        return {
          icon: repo.type.toLowerCase(),
          text: repo.fullName,
        };
      } else {
        return {
          icon: value.kind,
          text: value.repo,
        };
      }
    },
  ).pipe(startWith(null), publishReplay(1), refCount());

  constructor(
    private readonly dialog: DialogService,
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
    private readonly codeApi: CodeApiService,
    private readonly fb: FormBuilder,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    // TODO: async pipe in ng-template not subscribed when view init
    this.subscriptions.push(this.secrets$.subscribe());
    this.subscriptions.push(this.repositories$.subscribe());
    this.subscriptions.push(this.display$.subscribe());
  }

  ngOnInit() {
    this.fg = this.buildForm();
    this.init$.next();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  private buildForm(value: CodeRepositoryModel = null) {
    const { repo, secret, bindingRepository, kind } = value || {
      repo: '',
      secret: null,
      bindingRepository: null,
      kind: 'buildin',
    };

    return this.fb.group(
      {
        repo,
        secret,
        bindingRepository,
        usingBuildin: !kind || kind === 'buildin',
        urlType: kind === 'svn' ? 'svn' : 'git',
      },
      { validator: formValidator },
    );
  }

  private toValue() {
    const { usingBuildin, urlType, ...rest } = this.fg.value;

    return {
      ...rest,
      kind: usingBuildin ? 'buildin' : urlType,
    };
  }

  open() {
    this.repoDialog = this.dialog.open(this.repoTemplate, {
      size: DialogSize.Large,
    });
    this.onTouched();
  }

  writeValue(value: CodeRepositoryModel) {
    if (value && (value.repo || value.bindingRepository)) {
      this.valueChanged$.next(value);

      this.fg = this.buildForm(value);
    }
  }

  valueChange = (_: CodeRepositoryModel) => {};

  onTouched = () => {};

  registerOnChange(fn: any) {
    this.valueChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  onSubmit() {
    if (this.fg.invalid) {
      return;
    }
    const value = this.toValue();

    if (value.kind !== 'buildin') {
      this.valueChanged$.next(value);
      this.valueChange(value);
      this.repoDialog.close();
      this.cdr.markForCheck();
    } else {
      this.repositories$.pipe(take(1)).subscribe(repositories => {
        const repo = (repositories || []).find(
          (repo: CodeRepository) => repo.name === value.bindingRepository,
        );

        const filledValue = {
          ...value,
          repo: R.prop('httpURL', repo),
          secret: R.prop('secret', repo),
        };

        this.valueChanged$.next(filledValue);
        this.valueChange(filledValue);
        this.repoDialog.close();
        this.cdr.markForCheck();
      });
    }
  }

  resourceValue<T extends { name: string }>(val: T) {
    return (val && val.name) || val;
  }

  resourceIdentity<T extends { name: string }>(_: number, item: T) {
    return item.name;
  }

  addSecret() {
    this.secretActions
      .create([SecretType.BasicAuth, SecretType.SSH], '', this.project)
      .subscribe(secret => {
        if (secret) {
          this.secretCreated$.next(secret);
          this.fg.patchValue({ secret });
        }
      });
  }

  onSecretChange(change: any) {
    if (change === '') {
      this.fg.patchValue({
        secret: null,
      });
    }
  }

  formValidateErrorForField(field: string) {
    if (!this.form) {
      return null;
    }

    const control = this.fg && this.fg.get(field);

    if (control && (this.form.submitted || control.dirty)) {
      return (this.fg.errors && this.fg.errors[field]) || null;
    }
  }

  byIndex(index: number) {
    return index;
  }

  fromCredentialId(credentialId: string) {
    if (!credentialId) {
      return null;
    }

    if (credentialId.includes(this.project)) {
      return {
        namespace: this.project,
        name: credentialId.slice(this.project.length + 1),
      };
    }

    return {
      namespace: '',
      name: credentialId,
    };
  }
}

function formValidator(control: AbstractControl) {
  const usingBuildin = control.get('usingBuildin');
  const bindingRepository = control.get('bindingRepository');
  const repo = control.get('repo');
  const repoPattern = Validators.pattern(
    /^(http(s?):\/\/.+)|(git@.+:.+)|(ssh:\/\/.+)|(git:\/\/.+)|(svn:\/\/.+)/,
  );

  if (!usingBuildin.value) {
    const errors = Validators.required(repo) || repoPattern(repo);
    if (errors) {
      return {
        repo: errors,
      };
    }
  } else {
    const errors = Validators.required(bindingRepository);
    if (errors) {
      return {
        bindingRepository: errors,
      };
    }
  }

  return null;
}
