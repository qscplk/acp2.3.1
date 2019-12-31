import { TranslateService } from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  CodeApiService,
  CodeBinding,
  CodeBindingParams,
  Secret,
  SecretApiService,
  SecretType,
  groupByScope,
} from '@app/api';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { ProductService } from '@app/services';
import { OAuthValidatorComponent } from '@app/shared/components/oauth-validator';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';

export type Status = 'normal' | 'loading' | 'saving';

const defaultModel = () => ({
  name: '',
  description: '',
  secretType: SecretType.BasicAuth,
  secret: '',
  namespace: '',
  service: '',
});

enum ErrorInfo {
  LoadFail = 'code.binding_edit_load_fail',
  NotFound = 'code.binding_edit_not_found',
}

@Component({
  selector: 'alo-code-binding-basic-edit',
  templateUrl: 'binding-basic-edit.component.html',
  styleUrls: ['binding-basic-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'alo-code-binding-basic-edit',
})
export class CodeBindingBasicEditComponent implements OnInit {
  @Input()
  mode: 'create' | 'update' = 'create';

  @Input()
  service: string;

  @Input()
  namespace: string;

  @Input()
  name = '';

  @Output()
  saved = new EventEmitter<{
    name: string;
    namespace: string;
  }>();

  @Output()
  statusChange = new EventEmitter<Status>();

  get callbackUrl() {
    return (
      // TODO: for auth change, fix later
      // this.authService.snapshot.devopsHost ||
      `${window.location.protocol}//${window.location.host}`
    );
  }

  @ViewChild('form', { static: true })
  form: NgForm;

  secrets: Dictionary<Secret[]> = { public: [], private: [] };

  secretTypes = SecretType;

  createAppUrl = '';

  redirectUrl = '';

  codeRepoType: string;

  model: CodeBindingParams | CodeBinding = defaultModel();

  nameRule = TOOLCHAIN_BINDING_NAME;

  get disabledOauth2() {
    return this.codeRepoType === 'Gogs';
  }

  get isGitea() {
    return this.codeRepoType === 'Gitea';
  }

  get basicAuthText() {
    return this.isGitea ? 'secret.basic_auth' : 'code.token';
  }

  get redirectUrlHint() {
    return this.redirectUrl
      ? `${this.redirectUrl}${this.getCustomRedirectParam(this.codeRepoType)}`
      : '';
  }

  constructor(
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
    private readonly codeApi: CodeApiService,
    private readonly auiDialog: DialogService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly productService: ProductService,
  ) {}

  ngOnInit() {
    this.prepareForm();
    this.productService.getProducts().subscribe(products => {
      const matcher = products.find(prod => prod.name === 'console-devops');
      const prod = matcher ? matcher.url : '';
      this.redirectUrl = prod ? `${this.callbackUrl}${prod}` : '';
      this.cdr.markForCheck();
    });
  }

  private getCustomRedirectParam(type: string) {
    switch (type) {
      case 'Gitea':
        return '?is_secret_validate=true';
      default:
        return '';
    }
  }

  private prepareForm() {
    this.statusChange.emit('loading');
    this.getModel()
      .pipe(
        concatMap(model => {
          return forkJoin([
            this.getSecrets(model.secretType),
            this.getService(this.service || model.service),
          ]).pipe(map(([secrets, service]) => ({ model, secrets, service })));
        }),
      )
      .subscribe(
        ({ secrets, model, service }) => {
          this.secrets = secrets;
          this.model = model;
          this.createAppUrl = service.createAppUrl;
          this.codeRepoType = service.type;
          this.statusChange.emit('normal');
          this.cdr.markForCheck();
        },
        (error: { title: string; content: string }) => {
          this.secrets = { public: [], private: [] };
          this.statusChange.emit('normal');
          this.cdr.markForCheck();
          this.notification.warning(error);
        },
      );
  }

  submit() {
    (this.form as any).submitted = true;
    this.form.ngSubmit.emit();
  }

  save() {
    if (this.form.valid) {
      this.statusChange.emit('saving');
      const model = {
        ...this.model,
        namespace: this.namespace,
        service: this.service,
      };
      const request =
        this.mode === 'create'
          ? this.codeApi.createBinding(
              model as CodeBindingParams,
              model.secretType === SecretType.OAuth2 ? this.redirectUrl : '',
            )
          : this.codeApi.updateBinding(model as CodeBinding, this.redirectUrl);

      request
        .pipe(
          catchError((res: HttpErrorResponse) => {
            if (res.status === 428 && model.secretType === SecretType.OAuth2) {
              return this.authSecret(res.error.authorizeUrl).pipe(
                concatMap(authed => (authed ? request : of(null))),
              );
            }
            throw res;
          }),
        )
        .subscribe(
          (result: any) => {
            this.statusChange.emit('normal');
            if (!result) {
              return;
            }
            this.saved.emit({
              name: this.model.name,
              namespace: this.namespace,
            });
            if (this.mode === 'update') {
              this.message.success(
                this.translate.get('code.update_binding_succ'),
              );
            }
          },
          (error: any) => {
            this.statusChange.emit('normal');
            this.notification.error({
              title:
                this.mode === 'create'
                  ? this.translate.get('code.create_binding_fail')
                  : this.translate.get('code.update_binding_fail'),
              content: error.error.error || error.error.message || undefined,
            });
          },
        );
    }
  }

  private authSecret(url: string): Observable<boolean> {
    const dialogRef = this.auiDialog.open(OAuthValidatorComponent, {
      size: DialogSize.Small,
      data: {
        url,
        namespace: this.namespace,
        secret: this.model.secret,
        service: this.service || this.model.service,
        kind: ToolKind.CodeRepo,
      },
    });

    return dialogRef.afterClosed();
  }

  openCreateSecretDialog() {
    this.codeApi
      .getService(this.model.service || this.service)
      .pipe(
        catchError(() => of(null)),
        switchMap(service => {
          return this.secretActions.createForToolChain(
            ToolKind.CodeRepo,
            service.type,
            this.model.secretType,
          );
        }),
      )
      .subscribe(result => {
        if (result) {
          this.getSecrets(this.model.secretType).subscribe(secrets => {
            this.secrets = secrets;
            this.model.secret = this.secretToValue(result);
            this.cdr.markForCheck();
          });
        }
      });
  }

  onSecretTypeChange() {
    this.getSecrets(this.model.secretType).subscribe(
      secrets => {
        this.secrets = secrets;
        this.model.secret = null;
        this.cdr.markForCheck();
      },
      () => {
        this.secrets = { public: [], private: [] };
        this.model.secret = null;
        this.cdr.markForCheck();
      },
    );
  }

  private getService(name: string) {
    return this.codeApi
      .getService(name)
      .pipe(catchError(this.throwFriendlyError(ErrorInfo.LoadFail)));
  }

  private getModel(): Observable<CodeBinding | CodeBindingParams> {
    if (this.mode === 'create') {
      return of(this.model);
    }

    const throwNotFound = this.throwFriendlyError(ErrorInfo.NotFound);
    const throwLoadFail = this.throwFriendlyError(ErrorInfo.LoadFail);

    return this.codeApi.getBinding(this.namespace, this.name).pipe(
      catchError(
        (error: HttpErrorResponse): Observable<CodeBinding> => {
          if (error.status === 404) {
            return throwNotFound(error);
          }

          return throwLoadFail(error);
        },
      ),
    );
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }

  private getSecrets(type: SecretType): Observable<Dictionary<Secret[]>> {
    return this.secretApi.find(null, this.namespace, true).pipe(
      map(result => result.items),
      map(items => items.filter(item => item.type === type)),
      map(groupByScope),
      catchError(this.throwFriendlyError(ErrorInfo.LoadFail)),
    );
  }

  private throwFriendlyError(translateKey: ErrorInfo) {
    return (error: HttpErrorResponse) => {
      throw {
        title: this.translate.get(translateKey as string),
        content: error.error.error || error.error.message || undefined,
      };
    };
  }
}
