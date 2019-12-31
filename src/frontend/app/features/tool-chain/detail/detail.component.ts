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
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SecretType, ToolService } from '@app/api';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import {
  BindingKindMappingK8sBindingSources,
  ToolKind,
  ToolkindMappingK8sSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { AddRegistryComponent } from '@app/modules/tool-chain/components/add-registry/add-registry.component';
import { ForceDeleteComponent } from '@app/modules/tool-chain/components/force-delete/force-delete.component';
import { SelectProjectComponent } from '@app/modules/tool-chain/components/select-project/select-project.component';
import { UpdateArtifactRegistryComponent } from '@app/modules/tool-chain/components/update-artifact-registry/update-artifact-registry.component';
import { UpdateToolComponent } from '@app/modules/tool-chain/components/update-tool/update-tool.component';
import { get } from 'lodash-es';
import { Observable, ReplaySubject, Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  delay,
  first,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'detail.component.html',
  styleUrls: ['detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPageComponent implements OnInit, OnDestroy {
  loadingBindings = false;
  name: string;
  kind: ToolKind;
  info: ToolService;
  manager: {
    kind: ToolKind;
    name: string;
  };

  detail$: Subject<ToolService> = new ReplaySubject(null);
  params$: Observable<{
    kind: ToolKind;
    name: string;
  }> = this.activatedRoute.paramMap.pipe(
    map(params => {
      return {
        kind: params.get('kind') as ToolKind,
        name: params.get('name'),
      };
    }),
    tap(params => {
      this.name = params.name;
      this.kind = params.kind;
    }),
    publishRef(),
  );

  fetcher = (params: { kind: ToolKind; name: string }) => {
    return this.toolChainApi
      .getToolService(params.kind, params.name)
      .pipe(tap(detail => this.detail$.next(detail)));
  };

  dataLoader = new AsyncDataLoader({
    params$: this.params$,
    fetcher: params => this.fetcher(params),
  });

  back() {
    this.router.navigateByUrl('/admin/tool-chain');
  }

  bindingsPermission$ = this.params$.pipe(
    switchMap(params => {
      return this.k8sPermissionService.isAllowed({
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[params.kind],
        ).TOOLCHAIN_BINDINGS,
        action: K8sResourceAction.CREATE,
      });
    }),
    publishRef(),
  );

  toolPermission$ = this.params$.pipe(
    switchMap(params => {
      return this.k8sPermissionService.isAllowed({
        type: getToolChainResourceDefinitions(
          ToolkindMappingK8sSources[params.kind],
        ).TOOLCHAIN,
        action: [K8sResourceAction.DELETE, K8sResourceAction.UPDATE],
        name: this.name,
      });
    }),
    publishRef(),
  );

  destroy$ = new Subject<void>();

  // Is artifact registry manager or not
  isManager$ = this.params$.pipe(
    map(({ kind }) => kind === ToolKind.ArtifactRegistryManager),
    publishRef(),
  );

  enterpriseIcon$ = this.translate.locale$.pipe(
    map(lang => `icons/enterprise_${lang}.svg`),
  );

  // Kind of manager the registry refered
  referedManager$ = this.detail$.pipe(
    map(detail => ({
      // TODO: temp fix typings
      kind: get(
        detail.ownerReferences,
        [0, 'kind'],
        '',
      ).toLowerCase() as ToolKind,
      name: get(detail.ownerReferences, [0, 'name'], '').toLowerCase(),
    })),
    map(manager => (manager.kind && manager.name ? manager : null)),
    tap(manager => (this.manager = manager)),
    publishRef(),
  );

  private readonly updated$ = new Subject<{ [key: string]: string }>();

  bindings$ = combineLatest([
    this.isManager$,
    this.params$,
    this.updated$.pipe(startWith({})),
  ]).pipe(
    tap(() => {
      this.loadingBindings = true;
    }),
    switchMap(([isManager, params]) =>
      isManager
        ? of(null)
        : this.toolChainApi.getBindingsByToolKind(params.kind, params.name),
    ),
    tap(() => {
      this.loadingBindings = false;
    }),
    catchError(() => {
      this.loadingBindings = false;
      return of(null);
    }),
    publishRef(),
  );

  private readonly refetchRegistries$ = new Subject<void>();

  subRegistries$ = combineLatest([
    this.isManager$,
    this.params$,
    this.refetchRegistries$.pipe(startWith(null)),
  ]).pipe(
    switchMap(([isManager, params]) =>
      isManager
        ? this.artifactRegistryApi.findRegistiresByManager(params.name)
        : of(null),
    ),
    map(data =>
      get(data, ['items'], []).sort(
        (prev: { name: string }, next: { name: string }) => {
          return prev.name.localeCompare(next.name);
        },
      ),
    ),
    catchError(error => {
      this.notification.error({
        content: error.error.error || error.error.message,
      });
      return of(null);
    }),
    publishRef(),
  );

  registriesPull$ = this.subRegistries$.pipe(
    delay(5000),
    takeUntil(this.destroy$),
  );

  private readonly update$ = new Subject<{ [key: string]: string }>();

  info$ = combineLatest([this.detail$, this.update$.pipe(startWith({}))]).pipe(
    map(([detail, update]) => ({ ...detail, ...update })),
    tap(info => (this.info = info)),
    publishRef(),
  );

  constructor(
    private readonly toolChainApi: ToolChainApiService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly k8sPermissionService: K8sPermissionService,
    private readonly activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.registriesPull$.subscribe(() => {
      this.refetchRegistries$.next();
    });
  }

  update() {
    this.info$.pipe(first()).subscribe(data => {
      const dialogRef = ['maven', 'maven2'].includes(data.type.toLowerCase())
        ? this.dialog.open(UpdateArtifactRegistryComponent, {
            data,
            size: DialogSize.Big,
          })
        : this.dialog.open(UpdateToolComponent, {
            data,
            size: DialogSize.Big,
          });
      dialogRef.afterClosed().subscribe(update => {
        if (update) {
          this.update$.next(update);
        }
      });
    });
  }

  delete() {
    combineLatest([this.info$, this.bindings$, this.subRegistries$])
      .pipe(first())
      .subscribe(([info, bindings, registries]) => {
        if (
          (bindings && bindings.length) ||
          (registries && registries.length)
        ) {
          this.dialog.open(ForceDeleteComponent, { data: info });
        } else {
          this.dialog
            .confirm({
              title: this.translate.get('tool_chain.delete_confirm', {
                name: info.name,
              }),
              confirmText: this.translate.get('delete'),
              confirmType: ConfirmType.Danger,
              cancelText: this.translate.get('cancel'),
              beforeConfirm: (resolve, reject) => {
                this.toolChainApi
                  .deleteTool(info.kind, info.name)
                  .subscribe(resolve, (error: any) => {
                    this.notification.error({
                      title: this.translate.get('tool_chain.delete_failed'),
                      content: error.error.error || error.error.message,
                    });
                    reject();
                  });
              },
            })
            .then(() => {
              this.message.success(
                this.translate.get('tool_chain.delete_successful'),
              );
              this.router.navigateByUrl(
                this.manager
                  ? `/admin/tool-chain/${this.manager.kind}/${this.manager.name}`
                  : '/admin/tool-chain',
              );
            })
            .catch(() => {});
        }
      });
  }

  bind() {
    this.dialog
      .open(SelectProjectComponent, {
        size: DialogSize.Large,
        fitViewport: true,
      })
      .afterClosed()
      .subscribe(project => {
        if (project) {
          this.router.navigate(
            [
              '/admin/projects',
              project,
              'create-binding',
              this.kind,
              this.name,
            ],
            {
              queryParams: {
                next: encodeURI(this.router.routerState.snapshot.url),
              },
            },
          );
        }
      });
  }

  hideSecret(info: ToolService) {
    return !['nexus', 'maven', 'maven2'].includes(info.type.toLowerCase());
  }

  getSecretType(type: SecretType) {
    switch (type) {
      case SecretType.BasicAuth:
        return 'secret.basic_auth';
      case SecretType.OAuth2:
        return 'secret.oauth2';
      default:
        return '-';
    }
  }

  addRegistry(mode: 'create' | 'integrate') {
    const dialogRef = this.dialog.open(AddRegistryComponent, {
      size: DialogSize.Big,
      data: {
        mode,
        managerName: this.name,
        secret: {
          name: this.info.secretName,
          namespace: this.info.secretNamespace,
        },
        error: this.info.status.phase === 'Error',
      },
    });

    dialogRef.componentInstance.saved.subscribe(() => {
      this.message.success(
        this.translate.get(
          mode === 'create'
            ? 'tool_chain.registry_create_success'
            : 'tool_chain.integrate_successful',
        ),
      );
      dialogRef.close();
      this.refetchRegistries$.next();
    });
  }

  navigateToDetail(service: ToolService) {
    this.router.navigate(['/admin/tool-chain', service.kind, service.name]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }
}
