import { KubernetesResource } from '@alauda/common-snippet';
import { ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';
import { Dictionary } from 'ts-essentials';

export interface LocalizedString {
  'zh-CN': string;
  en: string;
}

export interface NameValuePair<T> {
  name: string;
  value: T;
}

export interface AllCondition {
  all: Array<NameValuePair<unknown>>;
}

export interface AnyCondition {
  any: Array<NameValuePair<unknown>>;
}

export interface RelationDefine {
  when: NameValuePair<unknown> | AllCondition | AnyCondition;
  action: 'show' | 'hide';
}

export interface FieldDefine {
  name: string;
  schema: {
    type: string; // 'int' | 'string' | 'number' | 'boolean' | 'map' | 'array' | '*'
    items?: {
      type: string;
    };
    enum?: any[];
  };
  required: boolean;
  default: string;
  validation: {
    pattern?: string;
    maxLength?: number;
  };
  display: {
    type: string;
    args?: any;
    related?: string;
    name: LocalizedString;
    description: LocalizedString;
    advanced: boolean;
  };
  relation: RelationDefine[];
}

export interface TaskResoruce extends KubernetesResource {
  spec: {
    exports: Array<{
      name: string;
      description: LocalizedString;
    }>;
    arguments: FieldDefine[];
  };
}

export interface CodeChangeTrigger {
  readonly type: 'codeChange';
  codeChange: {
    enabled: boolean;
    periodicCheck: string;
  };
}

export interface CronTrigger {
  readonly type: 'cron';
  cron: {
    enabled: boolean;
    rule: string;
    readonly schedule: null;
  };
}

export type Trigger = CodeChangeTrigger | CronTrigger;

export interface ParallelStage {
  name: string; // 和第一个 task 的 阶段名称保持一致即可（目前界面尚未有该设置）
  tasks: Array<{
    name: string; // task template 的 name
    id: string; // 阶段名称，唯一标识
    kind: string; // task template 的 kind
  }>;
}

export interface GraphPipelineConfig extends KubernetesResource {
  spec: {
    jenkinsBinding: {
      name: string;
    };
    parameters: string;
    runLimits: {
      failureCount: 0;
      successCount: 0;
    };
    runPolicy: 'Serial' | 'Parallel';
    strategy: {
      jenkins: {
        jenkinsfilePath: 'jenkinsfile';
      };
    };
    template: {
      // 图形化创建时的信息
      // 结构是 PipelineTemplate的子集
      pipelineTemplate: {
        // PipelineTemplateSpec
        spec: {
          engine: 'graph'; // 图形化创建时， 固定该值
          agent: {
            label: string; // 前端选择 agent
          };
          stages: ParallelStage[];
        };
      };
      graphValues: Dictionary<Array<NameValuePair<string>>>;
    };
    triggers: Trigger[];
  };
}

export interface ValueSerializor<T> {
  deserialize(value: string): T;
  serialize(value: T): string;
}

export type OptionsResolver<T> = (
  related: unknown,
  exact: {
    state: Dictionary<unknown>;
    args: unknown;
    relatedField: string;
  },
) => Observable<T[]> | T[];

export interface ControlConfig<T> {
  serializor: ValueSerializor<T>;
  optionsResolver?: OptionsResolver<T>;
  isEqual(a: T, b: T): boolean;
}

export enum ControlTypes {
  Input = 'input',
  Switch = 'switch',
  Textarea = 'textarea',
  Code = 'code',
  Dropdown = 'dropdown',
  DropdownInput = 'dropdown-input',
  MultiDropdown = 'multi-dropdown',
  CodeRepositoryMix = 'alauda.io/coderepositorymix',
  DockerImageRepositoryMix = 'alauda.io/dockerimagerepositorymix',
  DockerImageRepositoryPullMix = 'alauda.io/dockerimagerepositorypullmix',
}

export interface CompiledFieldDefine
  extends Omit<FieldDefine, 'schema' | 'validation' | 'display' | 'relation'> {
  controlType: ControlTypes;
  controlConfig: ControlConfig<unknown>;
  defaultValue: unknown;
  required: boolean;
  hidden: (state: Dictionary<unknown>) => boolean;
  validators: ValidatorFn[];
  affectFields: string[];
  related: string;
  args?: any;
  displayName: LocalizedString;
  description: LocalizedString;
  advanced: boolean;
}

export interface TaskEntity {
  name: string;
  kind: string;
  group: string;
  groupTranslates: {
    'zh-CN': string;
    en: string;
  };
  displayName: LocalizedString;
  description: LocalizedString;
  fields: Dictionary<CompiledFieldDefine>;
  basic: string[];
  advanced: string[];
}

export interface TaskGroup {
  translates: {
    'zh-CN': string;
    en: string;
  };
  tasks: string[];
}

export interface FormEntity {
  values: Dictionary<unknown>;
  errors: Dictionary<ValidationErrors>;
  edited?: boolean;
}

export interface StageFormEntity extends FormEntity {
  stageId: string;
  options: Dictionary<{
    items: unknown[];
    pending: boolean;
  }>;
}
