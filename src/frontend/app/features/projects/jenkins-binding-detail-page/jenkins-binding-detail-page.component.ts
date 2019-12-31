import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
  publishRef,
} from '@alauda/common-snippet';
import { ConfirmType, DialogService, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  JenkinsApiService,
  JenkinsBinding,
  JenkinsResource,
  PipelineApiService,
  PipelineTrigger,
} from '@app/api';
import {
  BindingKind,
  BindingKindMappingK8sBindingSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { JenkinsBindingUpdateDialogComponent } from '@app/modules/jenkins-binding';
import {
  getCodeCheckNameByValue,
  hasEnabledTriggers,
  mapTriggerIcon,
  mapTriggerTranslateKey,
} from '@app/modules/pipeline/utils';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { filterBy, getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { last } from 'lodash-es';
import { BehaviorSubject, of } from 'rxjs';
import { map, publishReplay, refCount, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: 'jenkins-binding-detail-page.component.html',
  styleUrls: ['jenkins-binding-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JenkinsBindingDetailPageComponent {
  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      namespace: paramMap.get('name'),
      name: paramMap.get('bindingName'),
    })),
    tap(param => {
      this.name = param.name;
      this.namespace = param.namespace;
    }),
    publishReplay(1),
    refCount(),
  );

  permission$ = this.identity$.pipe(
    switchMap(({ namespace, name }) =>
      this.k8sPermissionsService.isAllowed({
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[BindingKind.Jenkins],
        ).TOOLCHAIN,
        action: [K8sResourceAction.DELETE, K8sResourceAction.UPDATE],
        name,
        namespace,
      }),
    ),
    publishRef(),
  );

  dataLoader = new AsyncDataLoader({
    params$: this.identity$,
    fetcher: params => this.fetchJenkinsBinding(params),
  });

  back() {
    this.location.back();
  }

  mapTriggerIcon = mapTriggerIcon;
  getCodeCheckNameByValue = getCodeCheckNameByValue;
  hasEnabledTriggers = hasEnabledTriggers;

  columns = ['name', 'triggers'];
  searchBy = 'name';
  name: string;
  namespace: string;
  resources: JenkinsResource[] = [];
  queryParams$ = new BehaviorSubject({
    page: 0,
    page_size: 20,
    search_by: this.searchBy,
    keywords: '',
    sort: 'name',
    direction: 'desc',
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly jenkinsApi: JenkinsApiService,
    private readonly pipelineApi: PipelineApiService,
    private readonly notification: NotificationService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly location: Location,
    private readonly k8sPermissionsService: K8sPermissionService,
  ) {
    this.identity$
      .pipe(
        switchMap(param =>
          this.jenkinsApi.getBindingResources(param.namespace, param.name),
        ),
      )
      .subscribe(res => {
        this.resources = res;
      });
  }

  fetchJenkinsBinding = (identity: { name: string; namespace: string }) => {
    if (!identity.name || !identity.namespace) {
      return of(null);
    }
    return this.jenkinsApi.getBinding(identity.namespace, identity.name);
  };

  fetchJenkinsPipelines = (param: {
    page: number;
    page_size: number;
    keywords: string;
    search_by: string;
    sort: string;
    direction: string;
  }) => {
    if (!this.name || !this.namespace) {
      return of(null);
    }
    return this.pipelineApi.findPipelineConfigs(
      this.namespace,
      getQuery(
        filterBy('jenkinsBinding', this.name),
        filterBy(this.searchBy, param.keywords),
        pageBy(param.page, param.page_size),
        sortBy(param.sort, param.direction === 'desc'),
      ),
    );
  };

  tryUnbind(data: JenkinsBinding) {
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

          this.unbind(data);
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

  update() {
    this.dialog
      .open(JenkinsBindingUpdateDialogComponent, {
        data: {
          namespace: this.namespace,
          name: this.name,
        },
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.dataLoader.reload();
        }
      });
  }

  unbind(data: JenkinsBinding) {
    if (this.resources.length) {
      this.dialog.open(ForceUnbindComponent, {
        data: {
          binding: data,
          unbind: () =>
            this.jenkinsApi.deleteBinding(data.namespace, data.name),
          hint: this.translate.get('project.force_unbind_jenkins_hint', {
            name: data.name,
          }),
        },
      });
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
                this.router.navigate(['/admin/projects', data.namespace]);
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

  secretRoute(value: string) {
    return ['/admin/secrets', ...value.split('/')];
  }

  secretName(value: string) {
    return last((value || '').split('/'));
  }

  getTriggerHint(trigger: PipelineTrigger) {
    return `${this.translate.get('enabled')} ${this.translate.get(
      mapTriggerTranslateKey(trigger.type),
    )} ${this.translate.get('pipeline_trigger')}, ${this.translate.get(
      'pipeline.trigger_rules',
    )}: ${this.translate.get(getCodeCheckNameByValue(trigger.rule))}`;
  }

  sortByChanged(event: { active: string; direction: string }) {
    this.queryParams$.next(
      Object.assign({}, this.queryParams$.getValue(), {
        sort: event.active,
        direction: event.direction,
      }),
    );
  }

  search(keywords: string) {
    this.queryParams$.next(
      Object.assign({}, this.queryParams$.getValue(), { keywords }),
    );
  }

  pageChange(event: { pageIndex: number; pageSize: number }) {
    this.queryParams$.next(
      Object.assign({}, this.queryParams$.getValue(), {
        page: event.pageIndex,
        page_size: event.pageSize,
      }),
    );
  }
}
