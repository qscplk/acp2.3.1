import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
  noop,
  publishRef,
} from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SecretType } from '@app/api';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import {
  ProjectManagementBinding,
  ProjectManagementProjectItem,
} from '@app/api/project-management/project-management.types';
import {
  BindingKind,
  BindingKindMappingK8sBindingSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { AssignProjectDialogComponent } from '@app/modules/porject-management/components/assign-project-dialog/assign-project-dialog.component';
import { ProjectManagementBindingUpdateDialogComponent } from '@app/modules/porject-management/components/binding-update-dialog/binding-update-dialog.component';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { compact, keyBy, last, merge, mergeWith, values } from 'lodash-es';
import {
  BehaviorSubject,
  NEVER,
  Observable,
  ReplaySubject,
  combineLatest,
  timer,
} from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  switchMapTo,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: './project-management-binding-detail-page.component.html',
  styleUrls: ['./project-management-binding-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementBindingDetailPageComponent {
  loading = false;
  updated$$ = new ReplaySubject<void>(1);
  projectsFilter$$ = new BehaviorSubject<string>('');

  params$ = this.activatedRoute.paramMap.pipe(
    map(paramMap => ({
      namespace: paramMap.get('name'),
      bindingName: paramMap.get('bindingName'),
    })),
    publishRef(),
  );

  assignPermisson$ = this.params$.pipe(
    switchMap(({ namespace, bindingName }) =>
      this.k8sPermissionsService.isAllowed({
        type: getToolChainResourceDefinitions().TOOLCHAIN_ASSIGN_REPO,
        action: K8sResourceAction.CREATE,
        name: bindingName,
        namespace,
      }),
    ),
    publishRef(),
  );

  permission$ = this.params$.pipe(
    switchMap(({ namespace, bindingName }) =>
      this.k8sPermissionsService.isAllowed({
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[BindingKind.ProjectManagement],
        ).TOOLCHAIN,
        action: [K8sResourceAction.DELETE, K8sResourceAction.UPDATE],
        name: bindingName,
        namespace,
      }),
    ),
    publishRef(),
  );

  back() {
    this.location.back();
  }

  dataLoader = new AsyncDataLoader({
    params$: this.params$,
    fetcher: params => this.fetcher(params),
  });

  binding$: Observable<ProjectManagementBinding> = combineLatest([
    this.params$,
    this.updated$$.pipe(startWith(null), switchMapTo(timer(0, 10000))),
  ]).pipe(
    tap(() => {
      this.loading = true;
      this.cdr.markForCheck();
    }),
    switchMap(([params]) => {
      return this.fetcher(params);
    }),
    tap(() => {
      this.loading = false;
      this.cdr.markForCheck();
    }),
    publishReplay(1),
    refCount(),
  );

  fetcher(params: { namespace: string; bindingName: string }) {
    return this.projectManagementApi.getBinding(
      params.namespace,
      params.bindingName,
    );
  }

  filteredProjects$ = combineLatest([
    this.binding$,
    this.projectsFilter$$,
  ]).pipe(
    map(([binding, keyword]) => {
      this.cdr.markForCheck();
      const projects = compact(
        values(
          mergeWith(
            keyBy(binding.projectManagementProjectInfos, 'name'),
            keyBy(binding.projectManagementProjects, 'name'),
            (f, s) => {
              if (f && f.name && s && s.name && f.name === s.name) {
                return merge(f, s);
              }
              return false;
            },
          ),
        ),
      );
      return (projects || []).filter((item: ProjectManagementProjectItem) =>
        item.name.includes(keyword),
      );
    }),
    catchError(() => NEVER),
    publishReplay(1),
    refCount(),
  );

  typeTranslates: Dictionary<string> = {
    [SecretType.BasicAuth]: 'secret.basic_auth',
  };

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectManagementApi: ProjectManagementApiService,
    private dialog: DialogService,
    private translate: TranslateService,
    private message: MessageService,
    private notification: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private k8sPermissionsService: K8sPermissionService,
  ) {}

  secretRoute(value: string) {
    return ['/admin/secrets', ...value.split('/')];
  }

  secretName(value: string) {
    return last((value || '').split('/'));
  }

  getSecretTypeDisplayName(type: string) {
    return this.typeTranslates[type];
  }

  unbind(binding: ProjectManagementBinding) {
    if (binding.projectManagementProjectInfos.length) {
      this.dialog.open(ForceUnbindComponent, {
        data: {
          binding,
          unbind: () =>
            this.projectManagementApi.deleteBinding(
              binding.namespace,
              binding.name,
            ),
        },
      });
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('project.delete_registry_binding_confirm', {
            name: binding.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          confirmType: ConfirmType.Danger,
          cancelText: this.translate.get('cancel'),
          beforeConfirm: (resolve, reject) => {
            this.projectManagementApi
              .deleteBinding(binding.namespace, binding.name)
              .subscribe(resolve, error => {
                this.notification.error({
                  title: this.translate.get('project.unbind_failed'),
                  content: error.error.error || error.error.message,
                });
                reject();
              });
          },
        })
        .then(() => {
          this.message.success(
            this.translate.get('project.unbind_successfully'),
          );
          this.router.navigate([
            '/admin/projects',
            this.activatedRoute.snapshot.paramMap.get('name'),
          ]);
        })
        .catch(() => noop);
    }
  }

  updateBind(binding: ProjectManagementBinding) {
    this.dialog
      .open(ProjectManagementBindingUpdateDialogComponent, {
        size: DialogSize.Large,
        data: binding,
      })
      .afterClosed()
      .subscribe((updated: boolean) => {
        if (updated) {
          this.updated$$.next();
        }
      });
  }

  assignProject(binding: ProjectManagementBinding) {
    this.dialog
      .open(AssignProjectDialogComponent, {
        size: DialogSize.Large,
        data: binding,
      })
      .afterClosed()
      // tslint:disable-next-line:no-identical-functions
      .subscribe((updated: boolean) => {
        if (updated) {
          this.updated$$.next();
        }
      });
  }
}
