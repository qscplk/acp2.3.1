import {
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
} from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  Inject,
} from '@angular/core';
import {
  CodeApiService,
  CodeBinding,
  CodeQualityApiService,
  CodeQualityBinding,
  JenkinsApiService,
  JenkinsBinding,
  JenkinsResource,
  PipelineApiService,
} from '@app/api';
import { ResourceBinding } from '@app/api/api.types';
import { mapCodeQualityBinding } from '@app/api/code-quality/utils';
import { toCodeRepoBinding } from '@app/api/code/utils';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import { ProjectManagementBinding } from '@app/api/project-management/project-management.types';
import { mapProjectManagementBinding } from '@app/api/project-management/utils';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import { mapResourceToRegistryBinding } from '@app/api/registry/utils';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolBinding } from '@app/api/tool-chain/tool-chain-api.types';
import {
  BindingKind,
  BindingKindMappingK8sBindingSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { getQuery } from '@app/utils/query-builder';
import { last } from 'lodash-es';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Component({
  selector: 'alo-binding-list',
  templateUrl: 'binding-list.component.html',
  styleUrls: ['binding-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BindingListComponent {
  _permissionCache: { [key: string]: boolean } = {};
  @Input()
  bindings: ToolBinding[];

  columns = ['name', 'project', 'secret', 'bind_at', 'actions'];
  resources: JenkinsResource[] = [];

  @Output()
  updateTable = new EventEmitter();

  constructor(
    private readonly codeApi: CodeApiService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly registryApi: RegistryApiService,
    private readonly pipelineApi: PipelineApiService,
    private readonly codeQualityApi: CodeQualityApiService,
    private readonly jenkinsApi: JenkinsApiService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly projectManagementApi: ProjectManagementApiService,
    private readonly k8sPermissionService: K8sPermissionService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  bindingName(_: number, binding: ToolBinding) {
    return binding.name;
  }

  secretRoute(value: string) {
    return ['/admin/secrets', ...value.split('/')];
  }

  secretName(value: string) {
    return last((value || '').split('/'));
  }

  unbindPermission(item: ToolBinding): boolean {
    const cacheValue = this._permissionCache[item.name];
    if (cacheValue !== undefined) {
      return cacheValue;
    }
    this._permissionCache[item.name] = false;
    this.k8sPermissionService
      .isAllowed({
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[item.kind],
        ).TOOLCHAIN_BINDINGS,
        action: K8sResourceAction.DELETE,
        namespace: item.namespace,
        name: item.name,
      })
      .subscribe(v => {
        this._permissionCache[item.name] = v;
        this.cdr.markForCheck();
      });
  }

  unbind(item: any) {
    switch (item.kind) {
      case BindingKind.CodeRepo:
        const codeRepoBinding = toCodeRepoBinding(
          item.__original,
          this.constants,
        );
        this.unbindCodeRepo(codeRepoBinding);
        break;
      case BindingKind.Registry:
        const registryBinding = mapResourceToRegistryBinding(
          item.__original,
          this.constants,
        );
        this.unbindRegistry(registryBinding);
        break;
      case BindingKind.Jenkins:
        this.tryUnbind(item);
        break;
      case BindingKind.CodeQuality:
        const codeBinding = mapCodeQualityBinding(
          item.__original,
          this.constants,
        );
        this.unbindCodeQuality(codeBinding);
        break;
      case BindingKind.ArtifactRegistry:
        this.unbindArtifactRegistry(item);
        break;
      case BindingKind.ProjectManagement:
        const projectManagementBinding = mapProjectManagementBinding(
          item.__original,
          this.constants,
        );
        this.unbindProjectManagement(projectManagementBinding);
        break;
    }
  }

  unbindProjectManagement(binding: ProjectManagementBinding) {
    if (binding.projectManagementProjectInfos.length) {
      const config = {
        binding,
        redirect: false,
        unbind: () =>
          this.projectManagementApi.deleteBinding(
            binding.namespace,
            binding.name,
          ),
      };
      this.openForceUnbindComponent(config);
    } else {
      this.dialog.confirm({
        title: this.translate.get('project.delete_registry_binding_confirm', {
          name: binding.name,
        }),
        confirmText: this.translate.get('project.unbind'),
        confirmType: ConfirmType.Danger,
        cancelText: this.translate.get('cancel'),
        beforeConfirm: (resolve, reject) => {
          this.projectManagementApi
            .deleteBinding(binding.namespace, binding.name)
            .subscribe(
              () => {
                this.message.success(
                  this.translate.get('project.unbind_successfully'),
                );
                this.updateTable.emit();
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
      });
    }
  }

  unbindArtifactRegistry(binding: ToolBinding) {
    this.openForceUnbindComponent({
      binding,
      redirect: false,
      unbind: () =>
        this.artifactRegistryApi.deleteBinding(binding.namespace, binding.name),
    });
  }

  unbindCodeRepo(data: CodeBinding) {
    if (data.owners.length) {
      const config = {
        binding: data,
        redirect: false,
        unbind: () => this.codeApi.deleteBinding(data.namespace, data.name),
      };
      this.openForceUnbindComponent(config);
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('project.delete_registry_binding_confirm', {
            name: data.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          confirmType: ConfirmType.Danger,
          cancelText: this.translate.get('cancel'),
          beforeConfirm: (resolve, reject) => {
            this.codeApi.deleteBinding(data.namespace, data.name).subscribe(
              () => {
                this.message.success(
                  this.translate.get('project.unbind_successfully'),
                );
                this.updateTable.emit();
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

  unbindRegistry(data: RegistryBinding) {
    if (data.repositories.length) {
      const config = {
        binding: data,
        redirect: false,
        unbind: () => this.registryApi.deleteBinding(data.namespace, data.name),
      };
      this.openForceUnbindComponent(config);
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('project.delete_registry_binding_confirm', {
            name: data.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          confirmType: ConfirmType.Danger,
          cancelText: this.translate.get('cancel'),
          beforeConfirm: (reslove, reject) => {
            this.registryApi.deleteBinding(data.namespace, data.name).subscribe(
              () => {
                this.message.success(
                  this.translate.get('project.unbind_successfully'),
                );
                this.updateTable.emit();
                reslove();
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

  unbindCodeQuality(data: CodeQualityBinding) {
    const project = data.conditions.filter(
      c => c.type === 'CodeQualityProject',
    );
    if (project.length) {
      this.dialog.open(ForceUnbindComponent, {
        data: {
          binding: data,
          unbind: () =>
            this.codeQualityApi.bindings.delete(data.namespace, data.name),
        },
      });
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('code_quality.delete_binding_confirm', {
            name: data.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          cancelText: this.translate.get('cancel'),
          confirmType: ConfirmType.Danger,
          beforeConfirm: (resolve, reject) => {
            this.codeQualityApi.bindings
              .delete(data.namespace, data.name)
              .subscribe(
                () => {
                  this.message.success({
                    content: this.translate.get('code_quality.unbind_succ'),
                  });
                  resolve();
                  this.updateTable.emit();
                },
                error => {
                  this.notification.error({
                    title: this.translate.get('code_quality.unbind_failed'),
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

  async tryUnbind(data: JenkinsBinding) {
    this.pipelineApi
      .findPipelineConfigs(data.namespace, getQuery())
      .pipe(
        map(res => res.items.some(item => item.jenkinsInstance === data.name)),
      )
      .subscribe(
        used => {
          if (used) {
            this.forbidden();
            return;
          }
          this.unbindJenkins(data);
        },
        (error: any) => {
          this.notification.error({
            title: this.translate.get(
              'project.get_jenkins_binding_usage_failed',
            ),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  async getJenkinsBindingResources(data: JenkinsBinding) {
    this.resources = await this.jenkinsApi
      .getBindingResources(data.namespace, data.name)
      .toPromise();
  }

  forbidden() {
    this.dialog
      .confirm({
        title: this.translate.get('project.delete_jenkins_binding_forbidden'),
        confirmText: this.translate.get('i_know'),
        confirmType: ConfirmType.Primary,
        cancelButton: false,
      })
      .catch(() => {});
  }

  async unbindJenkins(data: JenkinsBinding) {
    await this.getJenkinsBindingResources(data);
    if (this.resources.length) {
      const config = {
        binding: data,
        redirect: false,
        unbind: () => this.jenkinsApi.deleteBinding(data.namespace, data.name),
        hint: this.translate.get('project.force_unbind_jenkins_hint', {
          name: data.name,
        }),
      };
      this.openForceUnbindComponent(config);
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('project.delete_jenkins_binding_confirm', {
            name: data.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          confirmType: ConfirmType.Danger,
          cancelText: this.translate.get('cancel'),
          beforeConfirm: (resolve, reject) => {
            this.jenkinsApi.deleteBinding(data.namespace, data.name).subscribe(
              () => {
                this.message.success(
                  this.translate.get('project.unbind_successfully'),
                );
                this.updateTable.emit();
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

  openForceUnbindComponent = (config: {
    binding: ResourceBinding;
    redirect?: boolean;
    unbind: () => Observable<object>;
    hint?: string;
  }) => {
    const dialogRef = this.dialog.open(ForceUnbindComponent, {
      data: { ...config },
    });
    dialogRef.afterClosed().subscribe(update => {
      if (update) {
        this.updateTable.emit();
      }
    });
  };
}
