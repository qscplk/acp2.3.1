import { TranslateService } from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  CodeRepository,
  CodeRepositoryModel,
  PipelineConfigTemplateValues,
  PipelineGlobalSettings,
  PipelineTemplate,
  TemplateAgent,
} from '@app/api';
import { GlobalSettingDialogComponent } from '@app/modules/pipeline/components/global-setting-dialog/global-setting-dialog.component';
import {
  DROPDOWN_TYPES,
  INPUT_DROPDOWN_TYPES,
  MULTI_DROPDOWN_TYPES,
} from '@app/modules/pipeline/constant';
import { PipelineControlTypesService } from '@app/modules/pipeline/control-types.service';
import { combineReducers } from '@app/utils/combine-reducers';
import {
  ControlMapper,
  FieldDefine,
  GroupDefine,
} from 'alauda-ui-dynamic-forms';
import { assign, get, groupBy } from 'lodash-es';
import { map, publishReplay, refCount } from 'rxjs/operators';

import { LocalImageSelectorDataContext } from './local-image-selector-data-context';

@Component({
  selector: 'alo-pipeline-dynamic-parameters-form',
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PipelineControlTypesService],
})
export class PipelineDynamicParameterFormComponent
  implements OnInit, OnChanges {
  constructor(
    private controlTypeService: PipelineControlTypesService,
    private readonly translate: TranslateService,
    private readonly injector: Injector,
    private readonly dialog: DialogService,
  ) {}

  get valid() {
    return !this.ngForm || this.ngForm.valid;
  }

  @Input()
  project: string;

  @Input()
  jenkinsInstance: string;

  @Input()
  agent: TemplateAgent;

  @Input()
  templateFields: GroupDefine[];

  @Input()
  template: PipelineTemplate;

  @ViewChild('ngForm', { static: false })
  ngForm: NgForm;

  model: any = {};

  groups: any[];

  controlTypes: ControlMapper;

  globalSetting: PipelineGlobalSettings;

  // tslint:disable-next-line:variable-name
  dropdown_types = DROPDOWN_TYPES;

  // tslint:disable-next-line:variable-name
  input_dropdown_types = INPUT_DROPDOWN_TYPES;

  advancedState: Dictionary<boolean> = {};

  valueConverters: Dictionary<any> = {};

  contextRepositories: Dictionary<CodeRepository[]> = {};

  translateKey$ = this.translate.locale$.pipe(
    map((lang: string) => (lang === 'en' ? 'en' : 'zh-CN')),
    publishReplay(1),
    refCount(),
  );

  imageSelectorDataContext = new LocalImageSelectorDataContext(this.injector);

  ngOnInit() {
    this.controlTypeService.project = this.project;
    this.controlTypes = this.controlTypeService.getControlTypes();
  }

  private parseValue(
    value: string,
    defaultValue: string = null,
    item: FieldDefine = null,
  ) {
    try {
      const json = JSON.parse(value || defaultValue);
      if (get(item, 'display.type') === 'alauda.io/coderepositorymix') {
        // TODO: temp hack
        return this.toCodeRepositoryModel(json);
      }

      if (get(item, 'display.type') === 'alauda.io/toolbinding') {
        return json.name;
      }

      return json;
    } catch {
      return value || defaultValue;
    }
  }

  private getControlType(item: FieldDefine) {
    if (DROPDOWN_TYPES.includes(item.display.type)) {
      return 'dropdown';
    }
    if (MULTI_DROPDOWN_TYPES.includes(item.display.type)) {
      return 'multiDropdown';
    }

    switch (item.display.type) {
      case 'boolean':
        return 'switch';
      case 'string':
      case 'int':
        return 'input';
      case 'stringMultiline':
        return 'textarea';
      default:
        return item.display.type;
    }
  }

  private readonly groupsReducer = (groups: any[], g: GroupDefine) => {
    const partitions = groupBy(
      g.items.map(item => ({
        ...item,
        controlType: this.getControlType(item),
      })),
      (item: FieldDefine & { display: { advanced: boolean } }) =>
        item.display.advanced ? 'advanced' : 'default',
    );
    return [...(groups || []), { ...g, ...partitions }];
  };

  private readonly modelReducer = (model: any, g: GroupDefine) => {
    return g.items.reduce((accum, item: any) => {
      return {
        ...accum,
        [item.name]:
          item.display.type === 'string'
            ? item.value || item.default
            : item.display.type !== 'boolean'
            ? this.parseValue(item.value, item.default, item)
            : (item.value || item.default) === 'true',
      };
    }, model);
  };

  private readonly valueConvertersReducer = (
    converters: Dictionary<any>,
    g: GroupDefine,
  ) => {
    return g.items.reduce((accum, item: any) => {
      return {
        ...accum,
        [item.name]:
          item.display.type === 'alauda.io/toolbinding'
            ? (value: string) =>
                JSON.stringify({
                  namespace: this.project,
                  name: value,
                })
            : item.display.type === 'alauda.io/coderepositorymix'
            ? this.codeRepositoryValueConverter(item.name)
            : MULTI_DROPDOWN_TYPES.includes(item.display.type)
            ? (value: any) => JSON.stringify(value)
            : (value: any) => value,
      };
    }, converters);
  };

  ngOnChanges({ templateFields, template }: SimpleChanges) {
    if (
      templateFields &&
      templateFields.currentValue &&
      templateFields.currentValue.length
    ) {
      const reducer = combineReducers({
        model: this.modelReducer,
        groups: this.groupsReducer,
        valueConverters: this.valueConvertersReducer,
      });

      const {
        model,
        groups,
        valueConverters,
      } = templateFields.currentValue.reduce(reducer, null);

      this.model = model;
      this.groups = groups;
      this.valueConverters = valueConverters;
    }

    if (template && template.currentValue) {
      this.imageSelectorDataContext.params = {
        project: this.project,
        template: this.template,
      };
    }
  }

  groupTracker(_: number, group: GroupDefine) {
    return group.displayName.en;
  }

  fieldTracker(_: number, field: FieldDefine) {
    return field.name;
  }

  getValues(): PipelineConfigTemplateValues {
    const result = Object.keys((this.ngForm && this.ngForm.value) || {}).reduce(
      (accum, key) => ({
        ...accum,
        [key]: this.valueConverters[key](this.ngForm.value[key]),
      }),
      {},
    );
    const values = assign<{}, { [key: string]: any }>(result, {
      _pipeline_: {
        agent: {
          labelMatcher: this.getTemplateAgent().labelMatcher,
        },
        options: {
          raw: this.getTemplateOptions(),
        },
      },
    });
    if (this.globalSetting && this.globalSetting.mode === 'label') {
      values._pipeline_.agent.label = this.getTemplateAgent().label;
    } else if (this.globalSetting && this.globalSetting.mode === 'raw') {
      values._pipeline_.agent.raw = this.getTemplateAgent().raw;
    } else if (this.getTemplateAgent().label) {
      values._pipeline_.agent.label = this.getTemplateAgent().label;
    } else {
      values._pipeline_.agent.raw = this.getTemplateAgent().raw;
    }
    return values;
  }

  submit() {
    if (this.ngForm) {
      this.ngForm.onSubmit(null);
    }
  }

  trackFn(val: any) {
    if (val && val.key) {
      return val.key;
    }

    if (val && val.name) {
      const prefix = (val.namespace && `${val.namespace}/`) || '';
      return `${prefix}${val.name}`;
    }

    return val;
  }

  multiTrackFn(val: any) {
    return (val && `${val.name}:${val.namespace}`) || val;
  }

  codeRepositoryValueConverter = (field: string) => (
    data: CodeRepositoryModel,
  ) => {
    const codeRepositories = this.contextRepositories[field];

    if (data.kind === 'buildin') {
      const bindingRepository = (codeRepositories || []).find(
        item => item.name === data.bindingRepository,
      );

      if (!bindingRepository) {
        return data;
      }

      return {
        url: bindingRepository.httpURL,
        credentialId: this.formatSecret(bindingRepository.secret),
        kind: 'select',
        bindingRepositoryName: bindingRepository.name,
        sourceType: 'GIT',
      };
    }
    return {
      url: data.repo,
      credentialId: this.formatSecret(data.secret),
      sourceType: data.kind === 'svn' ? 'SVN' : 'GIT',
      kind: 'input',
    };
  };

  onRepositorySelecterContextChange(
    field: string,
    context: { codeRepositories?: CodeRepository[] },
  ) {
    if (context.codeRepositories) {
      this.contextRepositories[field] = context.codeRepositories;
    }
  }

  private formatSecret(secret: { namespace?: string; name: string }) {
    return secret
      ? // tslint:disable-next-line:no-nested-template-literals
        `${secret.namespace ? `${secret.namespace}-` : ''}${secret.name}`
      : '';
  }

  toCodeRepositoryModel(value: any): CodeRepositoryModel {
    const secret = this.fromCredentialId(value.credentialId);

    if (value.kind === 'select') {
      return {
        repo: '',
        secret,
        bindingRepository: value.bindingRepositoryName || '',
        kind: 'buildin',
      };
    }

    return {
      repo: value.url,
      secret,
      bindingRepository: '',
      kind: value.sourceType && value.sourceType === 'SVN' ? 'svn' : 'git',
    };
  }

  fromCredentialId(credentialId: string) {
    if (!credentialId) {
      return null;
    }

    if (credentialId.startsWith(this.project)) {
      return {
        namespace: this.project,
        name: credentialId.slice(this.project.length + 1),
      };
    }

    return {
      namespace: '',
      name: credentialId,
    };
  }

  toggleGroupAdvanced(g: any) {
    this.advancedState[g.displayName.en] = !this.advancedState[
      g.displayName.en
    ];
  }

  normalizeEditorOptions(args: any) {
    return args || { language: 'shell' };
  }

  openGlobalSetting() {
    const dialogRef = this.dialog.open(GlobalSettingDialogComponent, {
      size: DialogSize.Large,
      data: {
        value: {
          project: this.project,
          name: this.jenkinsInstance,
          agent: this.getTemplateAgent(),
          options: this.getTemplateOptions(),
          globalSetting: this.globalSetting,
        },
      },
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data) {
        this.globalSetting = {
          label: data.label,
          raw: data.raw,
          labelMatcher: data.labelMatcher,
          options: data.options,
          mode: data.mode,
        };
      }
    });
  }

  getTemplateAgent(): TemplateAgent {
    if (this.globalSetting) {
      // Create Pipeline
      const { label, labelMatcher, raw } = this.globalSetting;
      return { label, labelMatcher, raw };
    } else if (this.template.values) {
      // Update Pipeline
      try {
        return JSON.parse(this.template.values._pipeline_).agent;
      } catch (e) {
        // Past template create pipeline
        return this.agent;
      }
    } else {
      // Copy Pipeline
      return this.template.agent;
    }
  }

  getTemplateOptions(): string {
    if (this.globalSetting) {
      return this.globalSetting.options;
    } else if (this.template.values) {
      let pipeline;
      try {
        pipeline = JSON.parse(this.template.values._pipeline_);
        return pipeline.options.raw;
      } catch (e) {
        return '';
      }
    } else {
      return this.template.options;
    }
  }
}
