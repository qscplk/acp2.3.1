import { TranslateService } from '@alauda/common-snippet';
import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Secret, SecretApiService, SecretType, groupByScope } from '@app/api';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';
import { ReplaySubject, Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-bind-account-form',
  templateUrl: 'bind-account-form.component.html',
  styleUrls: ['bind-account-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BindAccountFormComponent {
  private _namespace: string;
  @Input()
  get namespace() {
    return this._namespace;
  }

  set namespace(val: string) {
    this._namespace = val;
    this.namespace$$.next(val);
  }

  @Input()
  service: string;

  @Output()
  statusChange = new EventEmitter<boolean>();

  @Output()
  bound = new EventEmitter<RegistryBinding>();

  @ViewChild('form', { static: true })
  ngForm: NgForm;

  nameRule = TOOLCHAIN_BINDING_NAME;
  private readonly secretsUpdated$$ = new Subject<void>();
  private readonly namespace$$ = new ReplaySubject<string>(1);

  secrets$ = combineLatest(
    this.namespace$$,
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

  hasAuth = true;

  constructor(
    private readonly secretActions: SecretActions,
    private readonly secretApi: SecretApiService,
    private readonly registryApi: RegistryApiService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
  ) {}

  addSecret() {
    this.registryApi
      .getService(this.service)
      .pipe(
        catchError(() => of(null)),
        switchMap(service => {
          return this.secretActions.createForToolChain(
            ToolKind.Registry,
            service.type,
            SecretType.BasicAuth,
          );
        }),
      )
      .subscribe(result => {
        if (result) {
          this.formData.secret = this.secretToValue(result);
          this.secretsUpdated$$.next();
        }
      });
  }

  submit() {
    this.ngForm.onSubmit(null);
    if (this.ngForm.invalid) {
      return;
    }
    this.statusChange.emit(true);
    this.registryApi
      .createBinding({
        namespace: this.namespace,
        service: this.service,
        name: this.formData.name,
        description: this.formData.description,
        secret: this.hasAuth ? this.formData.secret : '',
      })
      .subscribe(
        binding => {
          this.statusChange.emit(false);
          this.bound.emit(binding);
        },
        (error: any) => {
          this.notifaction.error({
            title: this.translate.get('registry.bind_account_failed'),
            content: error.error.error || error.error.message,
          });
          this.statusChange.emit(false);
        },
      );
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }
}
