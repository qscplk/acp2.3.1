import {
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
} from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  DialogSize,
  NotificationService,
  MessageService,
} from '@alauda/ui';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { SecretType } from '@app/api';
import { CodeApiService } from '@app/api/code/code-api.service';
import { CodeBinding } from '@app/api/code/code-api.types';
import {
  BindingKind,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { CodeBindingUpdateDialogComponent } from '@app/modules/code/components/binding-update-dialog/binding-update-dialog.component';
import { CodeRepositoryAssignDialogComponent } from '@app/modules/code/components/repository-assign-dialog/repository-assign-dialog.component';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { last } from 'lodash-es';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-code-binding-detail',
  templateUrl: 'binding-detail.component.html',
  styleUrls: ['binding-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBindingDetailComponent implements OnInit {
  @Input()
  data: CodeBinding;

  @Output()
  updated = new EventEmitter<void>();

  secretTypes = SecretType;
  bindingPermission$: Observable<{
    [K8sResourceAction.UPDATE]: boolean;
    [K8sResourceAction.DELETE]: boolean;
  }>;

  assignRepoPermission$: Observable<boolean>;

  enterpriseIcon$ = this.translate.locale$.pipe(
    map(lang => `icons/enterprise_${lang}.svg`),
  );

  constructor(
    private readonly codeApi: CodeApiService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly router: Router,
    private readonly permission: K8sPermissionService,
  ) {}

  ngOnInit() {
    this.bindingPermission$ = this.permission.isAllowed({
      name: this.data && this.data.name,
      namespace: this.data && this.data.namespace,
      type: getToolChainResourceDefinitions(BindingKind.CodeRepo)
        .TOOLCHAIN_BINDINGS,
      action: [K8sResourceAction.UPDATE, K8sResourceAction.DELETE],
    });
    this.assignRepoPermission$ = this.permission.isAllowed({
      name: this.data && this.data.name,
      namespace: this.data && this.data.namespace,
      type: getToolChainResourceDefinitions().TOOLCHAIN_ASSIGN_REPO,
      action: K8sResourceAction.CREATE,
    });
  }

  fetchCodeRepositories = (identity: { name: string; namespace: string }) => {
    return this.codeApi.findCodeRepositoriesByBinding(
      identity.namespace,
      identity.name,
    );
  };

  update() {
    const dialogRef = this.dialog.open(CodeBindingUpdateDialogComponent, {
      size: DialogSize.Large,
      data: {
        name: this.data.name,
        namespace: this.data.namespace,
        service: this.data.service,
      },
    });

    dialogRef.afterClosed().subscribe(this.emitUpdated());
  }

  delete() {
    if (this.data.owners.length) {
      this.dialog.open(ForceUnbindComponent, {
        data: {
          binding: this.data,
          unbind: () =>
            this.codeApi.deleteBinding(this.data.namespace, this.data.name),
        },
      });
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('project.delete_registry_binding_confirm', {
            name: this.data.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          confirmType: ConfirmType.Danger,
          cancelText: this.translate.get('cancel'),
          beforeConfirm: (resolve, reject) => {
            this.codeApi
              .deleteBinding(this.data.namespace, this.data.name)
              .subscribe(
                () => {
                  this.message.success(
                    this.translate.get('project.unbind_successfully'),
                  );
                  this.router.navigate([
                    '/admin/projects',
                    this.data.namespace,
                  ]);
                  resolve();
                },
                error => {
                  this.notification.error({
                    title: this.translate.get('project.unbind_failed'),
                    content: error.error.error || error.error.message,
                  });
                  reject();
                },
              );
          },
        })
        .catch(() => {});
    }
  }

  assignRepository() {
    const dialogRef = this.dialog.open(CodeRepositoryAssignDialogComponent, {
      size: DialogSize.Large,
      data: {
        name: this.data.name,
        namespace: this.data.namespace,
      },
    });

    dialogRef.afterClosed().subscribe(this.emitUpdated());
  }

  secretRoute(value: string) {
    return ['/admin/secrets', ...value.split('/')];
  }

  secretName(value: string) {
    return last((value || '').split('/'));
  }

  private emitUpdated() {
    return (result: any) => {
      if (result) {
        this.updated.emit();
      }
    };
  }
}
