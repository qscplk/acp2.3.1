import { TranslateService } from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChange,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PipelineApiService,
  PipelineConfigModel,
  PipelineConfigTemplate,
  PipelineKind,
  PipelineTemplate,
} from '@app/api';
import { templateStagesConvert } from '@app/api/pipeline/utils';
import { stringifyEach } from '@app/modules/pipeline/utils';
import { extend, get } from 'lodash-es';
import { map, publishReplay, refCount } from 'rxjs/operators';

import { MODEL } from '../../constant';
import { PipelineDynamicParameterFormComponent } from '../forms/parameters/parameters.component';
import { PreviewJenkinsfileComponent } from '../preview-jenkinsfile/preview-jenkinsfile.component';
import { PipelineTemplateDetailComponent } from '../template/detail/pipeline-template-detail.component';

@Component({
  selector: 'alo-pipeline-update-container',
  templateUrl: './pipeline-update-container.component.html',
  styleUrls: ['./pipeline-update-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineUpdateContainerComponent implements OnInit, OnChanges {
  editorOptions = { language: 'Jenkinsfile', readOnly: true };
  form: FormGroup;
  method: string;
  jenkinsfilePreview: string;
  key$ = this.translate.locale$.pipe(
    map((lang: string) => (lang === 'en' ? 'en' : 'zh-CN')),
    publishReplay(1),
    refCount(),
  );

  @Input()
  name: string;

  @Input()
  project: string;

  @Input()
  pipelineConfig: PipelineConfigModel;

  @ViewChild('updateForm', { static: true })
  updateForm: NgForm;

  @ViewChild(PipelineDynamicParameterFormComponent, { static: false })
  parameterForm: PipelineDynamicParameterFormComponent;

  get sourceType() {
    return this.form.get('basic').get('source').value;
  }

  get modelTemplate(): PipelineTemplate {
    return get(this.form, 'controls.template.value');
  }

  constructor(
    private readonly api: PipelineApiService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translate: TranslateService,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly dialog: DialogService,
    private readonly _location: Location,
  ) {}

  ngOnInit() {
    this.form = this.formBuilder();
  }

  ngOnChanges({ pipelineConfig }: { pipelineConfig: SimpleChange }) {
    if (pipelineConfig && pipelineConfig.currentValue) {
      const type = get(pipelineConfig.currentValue, 'basic.source', 'repo');
      this.method = this.getMethod(pipelineConfig.currentValue);
      this.form.patchValue(pipelineConfig.currentValue);
      if (this.method === PipelineKind.Template) {
        this.form.removeControl('editor_script');
        this.form.removeControl('jenkinsfile');
      } else {
        this.form.removeControl('template');
        this.form.removeControl('parameters');
        if (type === 'repo') {
          this.form.removeControl('editor_script');
        } else if (type === 'script') {
          this.form.removeControl('jenkinsfile');
        }
      }
    }
  }

  submit() {
    if (this.submitValid()) {
      let data = {
        ...this.form.value,
      };
      if (this.method === PipelineKind.Template) {
        data = { ...data, template: this.getMergedTemplate() };
      }

      if (this.method === PipelineKind.MultiBranch) {
        data = {
          ...data,
          multiBranch: true,
        };
      }
      this.api
        .updatePipelineConfig({
          project: this.project,
          name: this.name,
          data,
        })
        .subscribe(
          () => {
            this.message.success(this.translate.get('pipeline.update_success'));
            this.router.navigate(
              ['../../', `${get(this.form.value, 'basic.name')}`],
              {
                relativeTo: this.route,
              },
            );
          },
          error => {
            this.notification.error({
              title: this.translate.get('pipeline.update_fail'),
              content: error.error.error || error.error.message,
            });
          },
        );
    }
  }

  cancel() {
    if (this.form.dirty) {
      this.dialog
        .confirm({
          title: this.translate.get('pipeline.cancel_update_confirm', {
            name: this.name,
          }),
          content: this.translate.get('pipeline.cancel_update_confirm_tip'),
          cancelText: this.translate.get('cancel'),
          confirmText: this.translate.get('confirm'),
        })
        .then(() => {
          this._location.back();
        })
        .catch(() => {});
    } else {
      this._location.back();
    }
  }

  preview() {
    this.dialog.open(PreviewJenkinsfileComponent, {
      size: DialogSize.Large,
      data: {
        template: get(this.form, 'controls.template.value'),
        postData: this.parameterForm.getValues(),
        project: this.project,
        mode: 'update',
        pipelineConfigName: this.name,
      },
    });
  }

  templateDetail(template: PipelineTemplate) {
    template.stages = templateStagesConvert(template.stages);
    this.dialog.open(PipelineTemplateDetailComponent, {
      size: DialogSize.Large,
      data: {
        template: template,
      },
    });
  }

  getCodeTriggerControls() {
    return get(this.form, 'controls.triggers.controls[0]', '');
  }

  getCronTriggerControls() {
    return get(this.form, 'controls.triggers.controls[1]', '');
  }

  getJenkinsBinding() {
    return get(this.form, 'controls.basic.controls.jenkins_instance.value');
  }

  private formBuilder() {
    return this.fb.group({
      template: get(MODEL, 'templateModel.template'),
      basic: this.fb.group(MODEL.basicModel),
      jenkinsfile: this.fb.group(MODEL.jenkinsfileModel),
      editor_script: this.fb.group(MODEL.scriptModel),
      triggers: this.fb.array([
        this.fb.group(
          extend(
            MODEL.codeTriggerModel,
            get(this.pipelineConfig, 'triggers.[0]', ''),
          ),
        ),
        this.fb.group(
          extend(
            MODEL.cronTriggerModel,
            get(this.pipelineConfig, 'triggers.[1]', ''),
          ),
        ),
      ]),
    });
  }

  private submitValid() {
    this.updateForm.onSubmit(null);
    const parameterFormValid = !this.parameterForm || this.parameterForm.valid;
    return this.updateForm.valid && parameterFormValid;
  }

  private getMergedTemplate(): PipelineConfigTemplate {
    const parameters = this.parameterForm.getValues();
    const template = get(this.form, 'controls.template.value');
    const kind: string = get(template, 'pipelineTemplateRef.kind');
    const name: string = get(template, 'pipelineTemplateRef.name');
    const namespace: string = get(template, 'pipelineTemplateRef.namespace');
    return {
      pipelineTemplateRef: { kind, name, namespace },
      values: stringifyEach(parameters),
    };
  }

  private getMethod(config: PipelineConfigModel) {
    const { __original } = config;

    // TODO: temp check multibranch from __original
    const kind = get(__original, ['objectMeta', 'labels', 'pipeline.kind']);

    return kind === 'multi-branch'
      ? PipelineKind.MultiBranch
      : config.template.values
      ? PipelineKind.Template
      : PipelineKind.Script;
  }
}
