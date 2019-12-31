import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Secret, SecretApiService, SecretType, groupByScope } from '@app/api';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { Subject, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'update-binding.component.html',
  styleUrls: ['update-binding.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateRegistryBindingComponent {
  formData = {
    description: this.binding.description,
    secret: this.binding.secret,
  };

  hasAuth = !!this.binding.secret;
  loading = false;

  private readonly secretsUpdated$$ = new Subject<void>();

  secrets$ = this.secretsUpdated$$.pipe(startWith(null)).pipe(
    switchMap(() => this.secretApi.find(null, this.binding.namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  @ViewChild('ngForm', { static: true })
  ngForm: NgForm;

  constructor(
    @Inject(DIALOG_DATA) public binding: RegistryBinding,
    private readonly secretActions: SecretActions,
    private readonly dialogRef: DialogRef,
    private readonly secretApi: SecretApiService,
    private readonly registryApi: RegistryApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
  ) {}

  addSecret() {
    this.registryApi
      .getService(this.binding.service)
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

  update() {
    this.ngForm.onSubmit(null);
    if (this.ngForm.invalid) {
      return;
    }
    this.loading = true;
    this.registryApi
      .updateBinding({
        ...this.binding,
        description: this.formData.description,
        secret: this.hasAuth ? this.formData.secret : '',
      })
      .subscribe(
        () => {
          this.dialogRef.close(true);
          this.message.success(
            this.translate.get('registry.update_registry_binding_succ'),
          );
        },
        error => {
          this.notifaction.error({
            title: this.translate.get(
              'registry.update_registry_binding_failed',
            ),
            content: error.error.error || error.error.message,
          });
          this.loading = false;
          this.cdr.markForCheck();
        },
      );
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }
}
