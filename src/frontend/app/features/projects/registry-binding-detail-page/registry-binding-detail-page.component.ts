import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
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
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import {
  BindingKind,
  BindingKindMappingK8sBindingSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { AssignRepositoryComponent } from '@app/modules/registry/components/assign-repository/assign-repository.component';
import { UpdateRegistryBindingComponent } from '@app/modules/registry/components/update-binding/update-binding.component';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { last } from 'lodash-es';
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
  first,
  map,
  startWith,
  switchMap,
  switchMapTo,
  take,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'registry-binding-detail-page.component.html',
  styleUrls: ['registry-binding-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryBindingDetailPageComponent {
  loading = true;
  error: any;
  updated$$ = new ReplaySubject<void>(1);
  repositoriesFilter$$ = new BehaviorSubject<string>('');
  params$ = this.activatedRoute.params.pipe(publishRef());

  binding$ = combineLatest(
    this.params$,
    this.updated$$.pipe(startWith(null)),
  ).pipe(
    switchMap(([params]) => this.fetcher(params)),
    publishRef(),
  );

  assignRepoPermission$ = this.params$.pipe(
    switchMap(({ bindingName, name }) =>
      this.k8sPermissionService.isAllowed({
        namespace: name,
        name: bindingName,
        type: getToolChainResourceDefinitions().TOOLCHAIN_ASSIGN_REPO,
        action: K8sResourceAction.CREATE,
      }),
    ),
    publishRef(),
  );

  permission$ = this.params$.pipe(
    switchMap(({ bindingName, name }) => {
      return this.k8sPermissionService.isAllowed({
        namespace: name,
        name: bindingName,
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[BindingKind.Registry],
        ).TOOLCHAIN,
        action: [K8sResourceAction.UPDATE, K8sResourceAction.DELETE],
      });
    }),
    publishRef(),
  );

  dataLoader = new AsyncDataLoader({
    params$: this.params$,
    fetcher: params => this.fetcher(params),
  });

  back() {
    this.location.back();
  }

  repositories$ = combineLatest(
    this.params$,
    this.updated$$.pipe(startWith(null), switchMapTo(timer(0, 10000))),
  ).pipe(
    tap(() => {
      this.loading = true;
      this.error = null;
    }),
    switchMap(([{ name, bindingName }]) =>
      this.registryApi.getRepositoriesByRegistryBinding(name, bindingName).pipe(
        catchError(err => {
          this.error = err;
          this.loading = false;
          this.cdr.markForCheck();
          return NEVER;
        }),
      ),
    ),
    tap(data => {
      if (data.errors.length) {
        this.error = data.errors;
      }
      this.loading = false;
    }),
    map(list => list.items),
    publishRef(),
  );

  filteredRepositories$ = combineLatest(
    this.repositories$,
    this.repositoriesFilter$$,
  ).pipe(
    map(([items, keyword]) =>
      items.filter(item => `${item.endpoint}/${item.image}`.includes(keyword)),
    ),
    publishRef(),
  );

  constructor(
    private registryApi: RegistryApiService,
    private dialog: DialogService,
    private translate: TranslateService,
    private message: MessageService,
    private notification: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private k8sPermissionService: K8sPermissionService,
  ) {}

  fetcher(params: any): Observable<RegistryBinding> {
    return this.registryApi.getBinding(params.name, params.bindingName);
  }

  assignRepository() {
    this.binding$
      .pipe(
        take(1),
        switchMap(binding =>
          this.dialog
            .open(AssignRepositoryComponent, {
              size: DialogSize.Large,
              data: { binding },
            })
            .afterClosed(),
        ),
      )
      .subscribe(result => {
        if (result) {
          this.updated$$.next();
        }
      });
  }

  updateBind() {
    this.binding$.pipe(take(1)).subscribe(binding => {
      this.dialog
        .open(UpdateRegistryBindingComponent, {
          size: DialogSize.Large,
          data: binding,
        })
        .afterClosed()
        .subscribe((updated: boolean) => {
          if (updated) {
            this.updated$$.next();
          }
        });
    });
  }

  unbind() {
    this.binding$.pipe(first()).subscribe(binding => {
      if (binding.repositories.length) {
        this.dialog.open(ForceUnbindComponent, {
          data: {
            binding,
            unbind: () =>
              this.registryApi.deleteBinding(binding.namespace, binding.name),
          },
        });
      } else {
        this.dialog.confirm({
          title: this.translate.get('project.delete_registry_binding_confirm', {
            name: binding.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          confirmType: ConfirmType.Danger,
          cancelText: this.translate.get('cancel'),
          beforeConfirm: (resolve, reject) => {
            this.registryApi
              .deleteBinding(binding.namespace, binding.name)
              .subscribe(
                () => {
                  this.message.success(
                    this.translate.get('project.unbind_successfully'),
                  );
                  this.router.navigate([
                    '/admin/projects',
                    this.activatedRoute.snapshot.paramMap.get('name'),
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
        });
      }
    });
  }

  secretRoute(value: string) {
    return ['/admin/secrets', ...value.split('/')];
  }

  secretName(value: string) {
    return last((value || '').split('/'));
  }
}
