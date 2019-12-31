import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  ObservableInput,
  TranslateService,
  publishRef,
} from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  MessageService,
  NotificationService,
  Sort,
} from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { CodeQualityApiService, CodeQualityBinding } from '@app/api';
import {
  BindingKind,
  BindingKindMappingK8sBindingSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { last } from 'lodash-es';
import { Observable, Subject, Subscription, combineLatest } from 'rxjs';
import { debounceTime, map, switchMap } from 'rxjs/operators';

import { CodeQualityBindingUpdateDialogComponent } from '../binding-update/binding-update-dialog.component';

@Component({
  selector: 'alo-code-quality-binding-detail',
  templateUrl: 'binding-detail.component.html',
  styleUrls: ['binding-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityBindingDetailComponent implements OnDestroy {
  @Input()
  namespace: string;

  @ObservableInput(true)
  private readonly namespace$: Observable<string>;

  @Input()
  name: string;

  @ObservableInput(true)
  private readonly name$: Observable<string>;

  params$ = combineLatest(this.namespace$, this.name$).pipe(
    map(([namespace, name]) => ({
      namespace,
      name,
    })),
    publishRef(),
  );

  permission$ = this.params$.pipe(
    switchMap(({ namespace, name }) => {
      return this.k8sPermissionService.isAllowed({
        namespace,
        name,
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[BindingKind.CodeQuality],
        ).TOOLCHAIN,
        action: [K8sResourceAction.UPDATE, K8sResourceAction.DELETE],
      });
    }),
    publishRef(),
  );

  dataLoader = new AsyncDataLoader({
    params$: this.params$,
    fetcher: params => this.fetchBinding(params),
  });

  projectsKeywords = '';

  projectsSort: Sort = {
    active: 'date',
    direction: 'desc',
  };

  @Output()
  removed = new EventEmitter<void>();

  private readonly projectsKeywordsChange$ = new Subject<string>();

  private readonly debouncedProjectsKeywordsChange$ = this.projectsKeywordsChange$.pipe(
    debounceTime(500),
  );

  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly codeQualityApi: CodeQualityApiService,
    private readonly dialog: DialogService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly location: Location,
    private readonly k8sPermissionService: K8sPermissionService,
  ) {
    this.subscriptions.push(
      this.debouncedProjectsKeywordsChange$.subscribe(keywords => {
        this.projectsKeywords = keywords;
        this.cdr.markForCheck();
      }),
    );
  }

  fetchBinding = ({ name, namespace }: { name: string; namespace: string }) =>
    this.codeQualityApi.bindings.get(namespace, name);

  back() {
    this.location.back();
  }

  secretRoute(value: string) {
    return ['/admin/secrets', ...value.split('/')];
  }

  secretName(value: string) {
    return last((value || '').split('/'));
  }

  onSortChange(sort: Sort) {
    this.projectsSort = sort;
  }

  onKeywordsChange(keywords: string) {
    this.projectsKeywordsChange$.next(keywords);
  }

  update() {
    this.dialog
      .open(CodeQualityBindingUpdateDialogComponent, {
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

  unbind(binding: CodeQualityBinding) {
    const project = binding.conditions.filter(
      c => c.type === 'CodeQualityProject',
    );
    if (project.length) {
      this.dialog.open(ForceUnbindComponent, {
        data: {
          binding,
          unbind: () =>
            this.codeQualityApi.bindings.delete(this.namespace, this.name),
        },
      });
    } else {
      this.dialog
        .confirm({
          title: this.translate.get('code_quality.delete_binding_confirm', {
            name: this.name,
          }),
          confirmText: this.translate.get('project.unbind'),
          cancelText: this.translate.get('cancel'),
          confirmType: ConfirmType.Danger,
          beforeConfirm: (resolve, reject) => {
            this.codeQualityApi.bindings
              .delete(this.namespace, this.name)
              .subscribe(
                () => {
                  this.message.success({
                    content: this.translate.get('code_quality.unbind_succ'),
                  });
                  resolve();
                  this.removed.emit();
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

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
