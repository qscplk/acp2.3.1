import {
  ImagePullDialogComponent,
  ImageRepositoryValue,
  TranslateService,
} from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ApplicationApiService,
  ApplicationIdentity,
  ClusterAccess,
  ComponentModel,
  Container,
  PublicIPAccess,
  PublicNetworkAccess,
  Report,
  SecretType,
  VolumeInfo,
  toRepoName,
} from '@app/api';
import { LocalImageSelectorDataContext } from '@app/modules/pipeline/components/forms/parameters/local-image-selector-data-context';
import { APPLICATION_NAME_RULE } from '@app/utils/patterns';
import { cloneDeep, get, isEmpty } from 'lodash-es';
import { Observable, Subject } from 'rxjs';

import { ReportsDialogComponent } from '../../reports-dialog/reports-dialog.component';

import { AppResourceFormComponent } from './app-resource-form/app-resource-form.component';
import { CreateAppMultiComputeComponent } from './multi-compute-component/multi-compute-component.component';

enum DisplayModel {
  List = 'list',
  YAML = 'yaml',
}
@Component({
  selector: 'alo-application-by-image',
  templateUrl: 'by-image.component.html',
  styleUrls: [
    'by-image.component.scss',
    '../../../shared-style/mutate-page-bottom-buttons.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateApplicationByImageComponent
  implements OnInit, OnDestroy, OnChanges {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly api: ApplicationApiService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly injector: Injector,
  ) {}

  get totalComponentNum() {
    return this.componentList.length >= this.componentListBuffer.length
      ? this.componentList.length
      : this.componentListBuffer.length;
  }

  get isEdit() {
    return !!this.deployments;
  }

  @Input()
  params: ApplicationIdentity;

  @Input()
  deployments: ComponentModel[];

  @Input()
  appName = '';

  @Input()
  displayName = '';

  @Output()
  saved = new EventEmitter<string>();

  @Output()
  canceled = new EventEmitter<void>();

  destroy$ = new Subject<void>();
  isMulti = false;
  isManagerComponent = false;
  isContinueToAdd = false;
  componentList: ComponentModel[] = [];
  componentListBuffer: ComponentModel[] = [];
  model: ComponentModel;
  submitting = false;
  displayModel: DisplayModel = DisplayModel.List;

  get validatorRule() {
    const maxLength = 62 - get(this.params, 'namespace.length', 0);
    return APPLICATION_NAME_RULE(maxLength);
  }

  @ViewChild('appResourceForm', { static: false })
  resourceForm: AppResourceFormComponent;

  @ViewChild('multiComputeComponent', { static: false })
  multiComputeComponent: CreateAppMultiComputeComponent;

  @ViewChild('applicationName', { static: false })
  appNameFormItem: any;

  imageSelectorDataContext = new LocalImageSelectorDataContext(this.injector);

  ngOnInit() {
    if (this.isEdit) {
      if (this.deployments.length > 1) {
        this.componentList = this.deployments;
        this.isManagerComponent = true;
        this.isMulti = true;
      } else {
        this.model = this.deployments[0];
      }
    } else {
      const { repoName, model } = this.initModel(
        this.route.snapshot.queryParamMap.get('tag'),
        this.route.snapshot.queryParamMap.get('repository_name'),
        this.route.snapshot.queryParamMap.get('repository_address'),
        this.route.snapshot.queryParamMap.get('secret'),
      );
      this.appName = repoName;
      this.model = model;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  ngOnChanges({ params }: SimpleChanges): void {
    if (params && params.currentValue) {
      this.imageSelectorDataContext.crossCluster = true;
      this.imageSelectorDataContext.params = {
        project: this.params.project,
        cluster: this.params.cluster,
        namespace: this.params.namespace,
        template: null,
        secretType: SecretType.DockerConfig,
      };
    }
  }

  create() {
    if (this.checkValid()) {
      this.createAction();
    }
  }

  createAction() {
    if (!this.isMulti) {
      this.componentList.push(this.model);
    }
    let formModel: any;
    if (this.multiComputeComponent) {
      formModel = this.multiComputeComponent.isYamlEditMode
        ? this.multiComputeComponent.handleYaml()
        : {
            componentList: this.componentList,
            appName: this.multiComputeComponent.appName,
            displayName: this.multiComputeComponent.displayName,
          };
    } else {
      formModel = {
        componentList: this.componentList,
        appName: this.appName,
        displayName: this.displayName,
      };
    }
    this.submitting = true;
    this.cdr.markForCheck();
    (this.multiComputeComponent && this.multiComputeComponent.isYamlEditMode
      ? this.api.createApplicationWithYaml(
          this.params.cluster,
          this.params.namespace,
          formModel,
        )
      : this.api.createApplication(
          this.params.cluster,
          this.params.namespace,
          formModel,
        )
    ).subscribe(
      (results: any) => {
        this.handleReports(results, 'create');
      },
      (error: any) => {
        this.notification.error({
          title: this.translate.get(
            'application.application_name_create_fail',
            { name: this.appName },
          ),
          content: error.error.error || error.error.message,
        });
        if (!this.isMulti) {
          this.componentList.pop();
        }
        this.submitting = false;
        this.cdr.markForCheck();
      },
    );
  }

  update() {
    if (this.checkValid()) {
      this.updateAction();
    }
  }

  updateAction() {
    if (!this.isMulti) {
      this.componentList.push(this.model);
    }
    this.submitting = true;
    this.cdr.markForCheck();
    const formModel = {
      componentList: this.componentList,
      appName: this.appName,
      displayName: this.isManagerComponent
        ? this.multiComputeComponent.displayName
        : this.displayName,
    };
    this.api
      .putApplication(
        this.params.cluster,
        this.params.namespace,
        formModel,
        formModel.appName,
      )
      .subscribe(
        (results: any) => {
          this.handleReports(results, 'update');
        },
        (error: any) => {
          this.notification.error({
            title: this.translate.get(
              'application.application_name_update_fail',
              { name: this.appName },
            ),
            content: error.error.error || error.error.message,
          });
          this.submitting = false;
          this.cdr.detectChanges();
        },
      );
  }

  handleReports(results: any, operation: string) {
    const reports: Report[] = get(results, 'result.items', []).map(
      (item: any) => ({
        name: item.name,
        type: item.kind,
        operation: item.action,
        error: item.error,
      }),
    );
    if (isEmpty(reports.filter(report => report.error))) {
      this.saved.emit(this.appName);
    } else {
      if (!this.isMulti) {
        this.componentList.pop();
      }
      this.dialog.open(ReportsDialogComponent, {
        data: {
          title: this.translate.get(
            `application.application_name_${operation}_fail`,
            { name: this.appName },
          ),
          failOrSuccess: 'fail',
          reports: reports,
        },
      });
    }
    this.submitting = false;
    this.cdr.markForCheck();
  }

  validateContainer() {
    let valid = true;
    this.model.containers.forEach(container => {
      valid = container.name && container.image && valid;
    });
    return valid;
  }

  save() {
    if (this.checkDuplicateComponentName(this.model.componentName)) {
      this.duplicateComponentNameErrorMessage();
      return;
    }
    if (this.checkFormValid()) {
      if (this.isContinueToAdd) {
        this.addComputeComponent();
      } else {
        this.componentList.push(this.model);
        this.isManagerComponent = true;
      }
    }
  }

  checkValid() {
    if (this.isManagerComponent) {
      return this.multiComputeComponent.form.valid;
    } else {
      return this.checkFormValid();
    }
  }

  checkFormValid() {
    return (
      this.resourceForm.checkFormValid() &&
      this.validateContainer() &&
      (this.appNameFormItem ? !this.appNameFormItem.errors : true)
    );
  }

  previewApp() {
    if (this.checkFormValid()) {
      this.displayModel = DisplayModel.YAML;
      this.addComponentAction();
    }
  }

  addComputeComponent() {
    if (this.checkDuplicateComponentName(this.model.componentName)) {
      this.duplicateComponentNameErrorMessage();
      return;
    }
    if (this.checkFormValid()) {
      this.addComponentAction();
      if (this.isContinueToAdd) {
        this.openSelectImageDialog();
      }
    }
  }

  editComponent(componentName: string) {
    const componentIndex = this.findComponentIndex(componentName);
    if (componentIndex >= 0) {
      this.model = this.componentList[componentIndex];
      this.componentListBuffer = cloneDeep(this.componentList);
      this.componentList = this.componentList.filter(
        item => item.componentName !== componentName,
      );
      this.displayModel = DisplayModel.List;
      this.isManagerComponent = false;
    }
  }

  cancelEdit() {
    this.componentList = this.componentListBuffer;
    this.isManagerComponent = true;
  }

  cancelCreate() {
    this.dialog
      .confirm({
        title: this.translate.get(
          `application.cancel_${this.isEdit ? 'update' : 'create'}_app_confirm`,
        ),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
      })
      .then(() => {
        this.canceled.emit();
      })
      .catch(() => {});
  }

  deleteComponent(componentName: string) {
    this.componentList = this.componentList.filter(
      item => item.componentName !== componentName,
    );
  }

  findComponentIndex(componentName: string) {
    return this.componentList.findIndex(
      component => component.componentName === componentName,
    );
  }

  openSelectImageDialog() {
    this.openImageDialog().subscribe((result: ImageRepositoryValue) => {
      if (result) {
        this.displayModel = DisplayModel.List;
        this.isManagerComponent = false;
        this.componentListBuffer = cloneDeep(this.componentList);
        const { model } = this.initModel(
          result.tag,
          result.repositoryPath,
          result.repositoryPath,
          result.secretName,
        );
        this.model = model;
        this.cdr.detectChanges();
      }
    });
  }

  addComponentSuccessMessage() {
    this.message.success({
      content: this.translate.get('application.compute_component_add_succ'),
    });
  }

  addComponentAction() {
    this.componentList.push(this.model);
    this.addComponentSuccessMessage();
    this.isManagerComponent = true;
    this.isMulti = true;
  }

  checkDuplicateComponentName(componentName: string) {
    return (
      this.componentList.filter(component => {
        return component.componentName === componentName;
      }).length > 0
    );
  }

  duplicateComponentNameErrorMessage() {
    this.message.error({
      content: this.translate.get(
        'application.compute_component_duplicate_name',
      ),
    });
  }

  initModel(
    tag: string,
    repositoryName: string,
    repositoryAddress: string,
    secret: string,
  ) {
    const repoName = toRepoName(tag, repositoryName, repositoryAddress);
    const containers: Container[] = [
      {
        name: repoName,
        image: tag ? `${repositoryAddress}:${tag}` : repositoryAddress,
        command: '',
        args: [''],
        resources: {
          limits: { cpu: '', memory: '' },
          requests: { cpu: '', memory: '' },
        },
        volumeMounts: [] as VolumeInfo[],
        secret: this.route.snapshot.queryParamMap.get('secret'),
      },
    ];
    const model = {
      componentName: repoName,
      replicas: 1,
      type: 'Deployment',
      labels: {},
      secrets: secret ? [secret] : [],
      clusterAccess: [] as ClusterAccess[],
      publicNetworkAccess: [] as PublicNetworkAccess[],
      publicIPAccess: [] as PublicIPAccess[],
      containers: containers,
      isNewComponent: true,
    };
    return { repoName, model };
  }

  openImageDialog(): Observable<any> {
    const dialogRef = this.dialog.open(ImagePullDialogComponent, {
      size: DialogSize.Large,
      data: { context: this.imageSelectorDataContext },
    });
    return dialogRef.afterClosed();
  }
}
