import { TranslateService } from '@alauda/common-snippet';
import { DialogService, MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  ApplicationApiService,
  ApplicationIdentity,
  Container,
  ComponentModel,
} from '@app/api';
import { APPLICATION_NAME_RULE } from '@app/utils/patterns';
import { safeDump, safeLoadAll } from 'js-yaml';
import { get, isEmpty } from 'lodash-es';

enum DisplayModel {
  List = 'list',
  YAML = 'yaml',
}

@Component({
  selector: 'alo-multi-compute-component',
  templateUrl: 'multi-compute-component.component.html',
  styleUrls: ['multi-compute-component.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAppMultiComputeComponent {
  @ViewChild('form', { static: true })
  form: NgForm;

  @Input()
  params: ApplicationIdentity;

  @Input()
  appName = '';

  @Input()
  displayName = '';

  @Input()
  isEdit = false;

  @Input()
  displayModel: DisplayModel = DisplayModel.List;

  @Input()
  set components(components: ComponentModel[]) {
    this._components = components || [];
    this.translateYaml();
  }

  get components(): ComponentModel[] {
    return this._components;
  }

  @Output()
  editComponent = new EventEmitter<string>();

  @Output()
  deleteComponent = new EventEmitter<string>();

  @Output()
  addComponent = new EventEmitter<void>();

  yaml = '';
  editorOptions = { language: 'yaml', readOnly: true };
  columns = ['componentName', 'type', 'replicas', 'container', 'actions'];
  selectedImages: string[] = [];
  _components: ComponentModel[];
  isYamlEditMode = false;

  get validatorRule() {
    const maxLength = 62 - get(this.params, 'namespace.length', 0);
    return APPLICATION_NAME_RULE(maxLength);
  }

  constructor(
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly api: ApplicationApiService,
  ) {}

  edit(component: any) {
    this.editComponent.emit(component.componentName);
  }

  delete(component: any) {
    if (this.components.length > 1) {
      this.deleteComponent.emit(component.componentName);
    }
  }

  add() {
    this.addComponent.emit();
  }

  displayImges(containers: Container[]) {
    this.selectedImages = containers.map(container => container.image);
  }

  translateYaml() {
    const formModel = {
      componentList: this.components,
      appName: this.appName,
      displayName: this.displayName,
    };
    this.api.getCreateApplicationYaml(this.params, formModel).subscribe(
      (results: any) => {
        this.yaml = get(results, 'application.resources', [])
          .map((r: any) => safeDump(r))
          .join('---\r\n');
        this.cdr.markForCheck();
      },
      (error: any) => {
        this.notification.error({
          title: this.translate.get('application.yaml_conversion_failed'),
          content: error.error.error || error.error.message,
        });
      },
    );
  }

  handleYaml() {
    const resources = safeLoadAll(this.yaml)
      .filter((resource: any) => !!resource)
      .map((resource: any) => ({
        ...resource,
        metadata: {
          ...resource.metadata,
          namespace: this.params.namespace,
        },
      }));

    if (isEmpty(resources)) {
      this.message.error({
        content: this.translate.get('application_yaml_invalid'),
      });
      return;
    }

    return {
      objectMeta: {
        name: this.appName,
      },
      typeMeta: {
        kind: 'application',
      },
      resources: resources,
      source: 'yaml',
      description: this.displayName,
    };
  }

  selectYamlEditingMode() {
    this.dialog
      .confirm({
        title: this.translate.get('application.switch_create_app_mode_title'),
        content: this.translate.get(
          'application.switch_create_app_mode_content',
        ),
        confirmText: this.translate.get('confirm'),
        cancelText: this.translate.get('cancel'),
        beforeConfirm: reslove => {
          reslove();
        },
      })
      .then(() => {
        this.isYamlEditMode = true;
        this.editorOptions = { language: 'yaml', readOnly: false };
        this.displayModel = DisplayModel.YAML;
        this.cdr.detectChanges();
      })
      .catch(() => {});
  }
}
