import { TranslateService } from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChange,
  TemplateRef,
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
import { toNewPipelineConfig } from '@app/modules/pipeline/utils';
import { GroupDefine } from 'alauda-ui-dynamic-forms';
import { assign, flattenDeep, get, isObject } from 'lodash-es';
import { Observable } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

import { MODEL, cronRuleValidator } from '../../constant';
import { PipelineDynamicParameterFormComponent } from '../forms/parameters/parameters.component';
import { PreviewJenkinsfileComponent } from '../preview-jenkinsfile/preview-jenkinsfile.component';

interface StepModel {
  templateStep: FormGroup;
  basicStep: FormGroup;
  repoStep: FormGroup;
  scriptStep: FormGroup;
  triggerStep: FormGroup;
}

export enum Step {
  Template = 'template_select',
  Basic = 'basic_info',
  DynamicParameters = 'template_parameter_config',
  MultibranchConfig = 'multi_branch_config',
  Jenkinsfile = 'jenkinsfile',
  Trigger = 'trigger',
}

export enum StepName {
  Template = 'templateSelect',
  Basic = 'basic',
  Repository = 'repository',
  Script = 'script',
  DynamicParameters = 'dynamicParameters',
  Trigger = 'trigger',
  End = 'end',
}

@Component({
  selector: 'alo-pipeline-create-container',
  templateUrl: './pipeline-create-container.component.html',
  styleUrls: ['./pipeline-create-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineCreateContainerComponent implements OnInit, OnChanges {
  editorOptions = { language: 'Jenkinsfile', readOnly: true };
  model: StepModel;
  stepIndex = 1;
  stepConfigs = [Step.Basic, Step.Jenkinsfile, Step.Trigger];
  jenkinsInstances: any[];
  jenkinsfilePreview: string;
  template: PipelineTemplate;
  triggerStep: FormGroup;

  forms: any[] = [];
  parameterFormValid = false;

  @Input()
  method: PipelineKind;

  @Input()
  templateID = '';

  @Input()
  project: string;

  @Input()
  type: 'copy' | 'create';

  @Input()
  name: string;

  @Output()
  templateSelected = new EventEmitter<PipelineTemplate>();

  @ViewChild('preview', { static: false })
  previewTemplate: TemplateRef<any>;

  @ViewChild(PipelineDynamicParameterFormComponent, { static: false })
  parameterForm: PipelineDynamicParameterFormComponent;

  @ViewChild('templateForm', { static: false })
  templateForm: NgForm;

  stepNames = StepName;

  // TODO: temp hack
  get modelTemplate() {
    return get(this.model, 'templateStep.controls.template.value');
  }

  constructor(
    private readonly api: PipelineApiService,
    private readonly router: Router,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly dialog: DialogService,
  ) {
    this.model = this.formBuilder();
  }

  ngOnInit() {
    if (this.method === PipelineKind.Template) {
      this.stepConfigs = [
        Step.Template,
        Step.Basic,
        Step.DynamicParameters,
        Step.Trigger,
      ];
      this.stepIndex = 0;
    }

    if (this.method === PipelineKind.MultiBranch) {
      this.stepConfigs = [Step.Basic, Step.MultibranchConfig, Step.Trigger];
      this.model.repoStep.patchValue({
        jenkinsfile: {
          repo: {
            repo: '',
            secret: '',
            bindingRepository: '',
          },
          branch: 'master|PR-.*|MR-.*',
          path: 'Jenkinsfile',
        },
      });
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  ngOnChanges({ type, name }: { type: SimpleChange; name: SimpleChange }) {
    if (
      type &&
      type.currentValue &&
      name &&
      name.currentValue &&
      type.currentValue === 'copy'
    ) {
      this.api
        .getPipelineConfigToModel(this.project, name.currentValue)
        .pipe(
          flatMap((pipelineConfig: PipelineConfigModel) =>
            this.getTemplateStep(pipelineConfig),
          ),
        )
        .subscribe(
          (pipelineConfig: PipelineConfigModel) => {
            pipelineConfig.basic.name = pipelineConfig.basic.name + '-copy';
            this.model.basicStep.patchValue({
              basic: pipelineConfig.basic,
            });
            this.model.triggerStep.patchValue({
              triggers: pipelineConfig.triggers,
            });
            if (this.method === PipelineKind.Script) {
              this.model.repoStep.patchValue({
                jenkinsfile: pipelineConfig.jenkinsfile,
              });
              this.model.scriptStep.patchValue({
                editor_script: pipelineConfig.editor_script,
              });
            } else if (this.method === PipelineKind.Template) {
              let pipeline;
              try {
                pipeline = JSON.parse(
                  pipelineConfig.template.values._pipeline_ as string,
                );
              } catch (e) {
                pipeline = {
                  agent: pipelineConfig.strategy.template.agent,
                  options: {
                    raw: '',
                  },
                };
              }
              this.model.templateStep.patchValue({
                template: {
                  ...pipelineConfig.strategy.template,
                  agent: pipeline.agent,
                  options: pipeline.options.raw,
                },
              });
              this.step('next', this.templateForm);
              this.templateSelected.emit(this.modelTemplate);
            } else if (this.method === PipelineKind.MultiBranch) {
              this.model.repoStep.patchValue({
                jenkinsfile: pipelineConfig.jenkinsfile,
              });
            }
          },
          () => {},
        );
    }
  }

  onTemplateSelect(form: NgForm) {
    this.step('next', form);
    this.templateSelected.emit(this.modelTemplate);
  }

  getTemplateStep(
    pipeline: PipelineConfigModel,
  ): Observable<PipelineConfigModel> {
    const name = get(pipeline, ['template', 'pipelineTemplateRef', 'name']);
    const kind = get(pipeline, ['template', 'pipelineTemplateRef', 'kind']);
    if (kind.toLowerCase() === 'clusterpipelinetemplate') {
      return this.api
        .clusterTemplateDetail(name)
        .pipe(
          map((target: PipelineTemplate) =>
            toNewPipelineConfig<PipelineConfigModel>(pipeline, target),
          ),
        );
    } else {
      return this.api
        .templateDetail(this.project, name)
        .pipe(
          map((targetTemplate: PipelineTemplate) =>
            toNewPipelineConfig<PipelineConfigModel>(pipeline, targetTemplate),
          ),
        );
    }
  }

  step(operation: 'next' | 'prev', form?: NgForm) {
    if (operation === 'prev') {
      if (
        this.method === PipelineKind.Template &&
        this.isStepOn(StepName.Basic)
      ) {
        this.templateSelected.emit(null);
      }
      this.stepIndex--;
    } else {
      if (
        this.isStepOn(StepName.DynamicParameters) &&
        this.method === PipelineKind.Template
      ) {
        this.parameterForm.submit();
        if (this.parameterForm.valid) {
          this.stepIndex++;
        }
      } else if (form && !form.onSubmit(null) && form.valid) {
        this.stepIndex++;
      }
    }
  }

  isStepOn(name: StepName) {
    if (name === StepName.Template) {
      return this.stepIndex === 0;
    }
    if (name === StepName.Basic) {
      return this.stepIndex === 1;
    }
    if (name === StepName.Repository) {
      return (
        this.stepIndex === 2 &&
        get(this.model, 'basicStep.value.basic.source', '') === 'repo'
      );
    }
    if (name === StepName.DynamicParameters) {
      return this.stepIndex === 2;
    }
    if (name === StepName.Script) {
      return (
        this.stepIndex === 2 &&
        get(this.model, 'basicStep.value.basic.source', '') === 'script'
      );
    }
    if (name === StepName.Trigger || name === StepName.End) {
      return this.stepIndex === 3;
    }
  }

  isSupport(name: StepName) {
    if (name === StepName.Template || name === StepName.DynamicParameters) {
      return this.method === PipelineKind.Template;
    }
    if (name === StepName.Repository || name === StepName.Script) {
      return (
        this.method === PipelineKind.Script ||
        this.method === PipelineKind.MultiBranch
      );
    }
  }

  submit(triggerForm: NgForm) {
    triggerForm.onSubmit(null);
    if (triggerForm.valid) {
      let data = {
        ...this.model.basicStep.value,
        ...this.model.scriptStep.value,
        ...this.model.triggerStep.value,
        jenkinsfile: this.model.repoStep.value.jenkinsfile,
        multiBranch: this.method === PipelineKind.MultiBranch,
      };
      if (this.method === PipelineKind.Template) {
        const template = this.getMergedTemplate();
        data = {
          ...data,
          template,
        };
        data.jenkinsfile.path = '';
      }
      this.api.createPipelineConfig(this.project, data).subscribe(
        () => {
          this.message.success(this.translate.get('pipeline.create_success'));
          this.router.navigate(
            ['../', `${get(this.model.basicStep.value, 'basic.name')}`],
            {
              relativeTo: this.route,
            },
          );
        },
        error => {
          this.errorMessage(error, 'pipeline.create_fail');
        },
      );
    }
  }

  cancel() {
    this.router.navigate(['../'], {
      relativeTo: this.route,
    });
  }

  jenkinsChanged(values: any[]) {
    this.jenkinsInstances = values;
    if (this.jenkinsInstances && !this.jenkinsInstances.length) {
      this.notification.error({
        content: this.translate.get('pipeline.no_instance'),
      });
    }
  }

  previewJenkinsfile() {
    this.dialog.open(PreviewJenkinsfileComponent, {
      size: DialogSize.Large,
      data: {
        template: get(this.model, 'templateStep.controls.template.value'),
        postData: this.parameterForm.getValues(),
        project: this.project,
        mode: 'create',
      },
    });
  }

  getCodeTriggerControls() {
    return get(this.model, 'triggerStep.controls.triggers.controls[0]');
  }

  getCronTriggerControls() {
    return get(this.model, 'triggerStep.controls.triggers.controls[1]');
  }

  getJenkinsBinding() {
    return get(
      this.model,
      'basicStep.controls.basic.controls.jenkins_instance.value',
      '',
    );
  }

  private formBuilder() {
    return {
      templateStep: this.buildGroup(MODEL.templateModel),
      basicStep: this.fb.group({ basic: this.buildGroup(MODEL.basicModel) }),
      repoStep: this.fb.group({
        jenkinsfile: this.buildGroup(MODEL.jenkinsfileModel),
      }),
      scriptStep: this.fb.group({
        editor_script: this.buildGroup(MODEL.scriptModel),
      }),
      triggerStep: this.fb.group({
        triggers: this.fb.array([
          this.buildGroup(MODEL.codeTriggerModel),
          this.buildGroup({
            enabled: false,
            cron_string: '',
            cron_object: [
              {
                days: {
                  mon: true,
                  tue: true,
                  wed: true,
                  thu: true,
                  fri: true,
                  sat: true,
                  sun: true,
                },
                times: ['00:00'],
              },
              [cronRuleValidator],
            ],
            sourceType: 'select',
          }),
        ]),
      }),
    };
  }

  private buildGroup(model: any, v?: any) {
    return this.fb.group(model, v);
  }

  private getMergedTemplate(): PipelineConfigTemplate {
    const parameters = this.parameterForm.getValues();
    const template = get(
      this.model,
      'templateStep.controls.template.value.__original',
    );
    const kind: string = get(template, 'kind');
    const name: string = get(template, 'metadata.name');
    const namespace: string = get(template, 'metadata.namespace');
    const dyArguments: GroupDefine[] = get(template, 'spec.arguments') || [];
    const itemList = flattenDeep(
      dyArguments.map((argument: GroupDefine) =>
        argument.items.map(item => ({ itemName: item.name })),
      ),
    ) as Array<{ itemName: string }>;
    const result = {
      pipelineTemplateRef: { kind, name, namespace },
      values: itemList.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.itemName]: this.unstring(parameters[cur.itemName])
            ? JSON.stringify(parameters[cur.itemName])
            : parameters[cur.itemName],
        }),
        {},
      ),
    };
    return {
      ...result,
      values: assign(result.values, {
        _pipeline_: JSON.stringify(parameters._pipeline_),
      }),
    };
  }

  private errorMessage(error: any, translateKey: string) {
    this.notification.error({
      title: this.translate.get(translateKey),
      content: error.error.error || error.error.message,
    });
  }

  private unstring(value: any) {
    return (
      isObject(value) || typeof value === 'number' || typeof value === 'boolean'
    );
  }
}
