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
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Secret, SecretApiService, SecretType, groupByScope } from '@app/api';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import { ProjectManagementBinding } from '@app/api/project-management/project-management.types';
import { mapBindingParamsToK8SResource } from '@app/api/project-management/utils';
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
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Component({
  templateUrl: './binding-update-dialog.component.html',
  styleUrls: ['./binding-update-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementBindingUpdateDialogComponent {
  SecretType = SecretType;
  form = this.buildForm();
  name: string;
  loading = false;
  private readonly secretsUpdated$$ = new Subject<void>();

  secrets$ = this.secretsUpdated$$.pipe(startWith(null)).pipe(
    switchMap(() => this.secretApi.find(null, this.binding.namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  constructor(
    @Inject(DIALOG_DATA) public binding: ProjectManagementBinding,
    private readonly fb: FormBuilder,
    private readonly secretApi: SecretApiService,
    private readonly projectManagementApi: ProjectManagementApiService,
    private readonly secretActions: SecretActions,
    private readonly dialogRef: DialogRef,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  private buildForm() {
    return this.fb.group({
      name: this.binding.name,
      description: this.binding.description,
      authType: this.binding.secretType,
      secret: this.fb.control(this.binding.secret, [Validators.required]),
    });
  }

  submit() {
    if (this.form.invalid) {
      return;
    }
    const description = this.form.get('description').value;
    const secret = this.form.get('secret').value;
    this.loading = true;
    const payload = mapBindingParamsToK8SResource(
      {
        ...this.binding,
        description,
        secret,
      },
      this.constants,
    );
    this.projectManagementApi.updateBinding(payload).subscribe(
      () => {
        this.dialogRef.close(true);
        this.message.success(
          this.translate.get(
            'project_management.update_project_management_binding_succ',
          ),
        );
      },
      error => {
        this.notification.error({
          title: this.translate.get(
            'project_management.update_project_management_binding_failed',
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

  addSecret() {
    this.projectManagementApi
      .getService(this.binding.service)
      .pipe(
        catchError(() => of(null)),
        switchMap(service => {
          return this.secretActions.createForToolChain(
            ToolKind.ProjectManagement,
            service.type,
            SecretType.BasicAuth,
          );
        }),
      )
      .subscribe(result => {
        if (result) {
          this.form.controls.secret.setValue(this.secretToValue(result));
          this.secretsUpdated$$.next();
        }
      });
  }
}
