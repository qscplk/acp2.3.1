import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { EntityState } from '@app/utils/redux';
import * as R from 'ramda';
import { v1 as uuid } from 'uuid';

import {
  CompiledFieldDefine,
  ControlConfig,
  FieldDefine,
  GraphPipelineConfig,
  LocalizedString,
  ParallelStage,
  StageFormEntity,
  TaskEntity,
  TaskResoruce,
  Trigger,
} from '../models/form';
import { ParallelEntity, StageEntity } from '../models/graph';
import { PipelineFormState } from '../reducers/pipeline-form';

import { compileFieldDefines } from './dynamic-form';

const pipelineConfigBase: GraphPipelineConfig = {
  spec: {
    jenkinsBinding: {
      name: null,
    },
    parameters: null,
    runLimits: {
      failureCount: 0,
      successCount: 0,
    },
    runPolicy: 'Serial',
    strategy: {
      jenkins: {
        jenkinsfilePath: 'jenkinsfile',
      },
    },
    template: {
      pipelineTemplate: {
        spec: {
          engine: 'graph',
          agent: null,
          stages: null,
        },
      },
      graphValues: null,
    },
    triggers: null,
  },
};

export const mergeFormErrors = R.pipe(
  (fg: FormGroup) => R.toPairs(fg.controls),
  R.reduce(
    (
      accum: Dictionary<ValidationErrors>,
      [name, control]: [string, AbstractControl],
    ) => (control.errors ? R.merge(accum, { [name]: control.errors }) : accum),
    null,
  ),
);

const pipelineFormValidators: Dictionary<ValidatorFn | ValidatorFn[]> = {
  name: [
    Validators.required,
    Validators.pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/),
    Validators.maxLength(64),
  ],
  jenkinsBinding: Validators.required,
};

const lenses = {
  name: R.lensPath<string, GraphPipelineConfig>(['objectMeta', 'name']),
  namespace: R.lensPath<string, GraphPipelineConfig>([
    'objectMeta',
    'namespace',
  ]),
  displayName: R.lensPath<string, GraphPipelineConfig>([
    'objectMeta',
    'annotations',
    'displayName',
  ]),
  jenkinsBinding: R.lensPath<string, GraphPipelineConfig>([
    'spec',
    'jenkinsBinding',
    'name',
  ]),
  runPolicy: R.lensPath<string, GraphPipelineConfig>(['spec', 'runPolicy']),
  agent: R.lensPath<string, GraphPipelineConfig>([
    'spec',
    'template',
    'pipelineTemplate',
    'spec',
    'agent',
    'label',
  ]),
  triggers: R.lensPath<Trigger[], GraphPipelineConfig>(['spec', 'triggers']),
  stages: R.lensPath<ParallelStage[], GraphPipelineConfig>([
    'spec',
    'template',
    'pipelineTemplate',
    'spec',
    'stages',
  ]),
  graphValues: R.lensPath<
    Dictionary<Array<{ name: string; value: string }>>,
    GraphPipelineConfig
  >(['spec', 'template', 'graphValues']),
};

const parseTrigger = (trigger: Trigger) =>
  trigger.type === 'codeChange'
    ? {
        codeChangeEnabled: R.pathOr<boolean, boolean>(
          false,
          ['codeChange', 'enabled'],
          trigger,
        ),
        codeChangePeriodicCheck: R.pathOr<string, string>(
          'H/2 * * * *',
          ['codeChange', 'periodicCheck'],
          trigger,
        ),
      }
    : {
        cronEnabled: R.pathOr<boolean, boolean>(
          false,
          ['cron', 'enabled'],
          trigger,
        ),
        cronRule: R.pathOr<string, string>(
          '0 18 * * *',
          ['cron', 'rule'],
          trigger,
        ),
      };

const parseTriggers = (triggers: Trigger[]) =>
  R.reduce(
    (accum, trigger) => ({
      ...accum,
      ...parseTrigger(trigger),
    }),
    {
      codeChangeEnabled: false,
      codeChangePeriodicCheck: 'H/2 * * * *',
      cronEnabled: false,
      cronRule: '0 18 * * *',
    },
    triggers,
  );

const getPipelineFormValues = (pipeline: GraphPipelineConfig) => ({
  name: R.view(lenses.name, pipeline) || '',
  displayName: R.view(lenses.displayName, pipeline) || '',
  jenkinsBinding: R.view(lenses.jenkinsBinding, pipeline) || '',
  runPolicy: R.view(lenses.runPolicy, pipeline) || '',
  agent: R.view(lenses.agent, pipeline) || '',
  ...parseTriggers(R.view(lenses.triggers, pipeline) || []),
});

export const getPipelineForm = (values: Dictionary<unknown>) =>
  new FormGroup(
    R.mapObjIndexed(
      (value, key) =>
        new FormControl(value, R.propOr(null, key, pipelineFormValidators)),
      values,
    ),
  );

const getPipelineFlow = R.pipe(
  R.view(lenses.stages),
  items => items || <typeof items>[],
  R.reduce(
    ({ parallels, stages, forks }, parallelStage) => {
      const parallelId = uuid();

      const parallel = {
        id: parallelId,
        name: parallelStage.name,
        nameEdited: true,
        stages: R.map(
          task => ({
            id: uuid(),
            name: task.id,
            parent: parallelId,
            task: `${task.kind}/${task.name}`,
          }),
          parallelStage.tasks,
        ),
      };

      return {
        parallels: [...parallels, R.omit(['stages'], parallel)],
        stages: [...stages, ...parallel.stages],
        forks: {
          ...forks,
          [parallel.id]: R.map(R.prop('id'), parallel.stages),
        },
      };
    },
    {
      parallels: <ParallelEntity[]>[],
      stages: <StageEntity[]>[],
      forks: <Dictionary<string[]>>{},
    },
  ),
);

export const compileTask = (
  customControlConfigs: Dictionary<ControlConfig<unknown>>,
) =>
  R.converge(
    (
      kind: string,
      name: string,
      group: string,
      groupZh: string,
      icon: string,
      displayName: LocalizedString,
      description: LocalizedString,
      fields: Dictionary<CompiledFieldDefine>,
      { basic, advanced }: Dictionary<string[]>,
    ) => ({
      kind,
      name,
      group,
      groupTranslates: {
        'zh-CN': groupZh || group,
        en: group,
      },
      icon,
      displayName,
      description,
      fields,
      basic,
      advanced,
    }),
    [
      R.propOr('', 'kind'),
      R.pathOr('', ['metadata', 'name']),
      R.pathOr('', ['metadata', 'labels', 'category']),
      R.pathOr('', ['metadata', 'labels', 'category.zh-CN']),
      R.pipe(
        R.pathOr('', ['metadata', 'annotations', 'style.icon']),
        R.split(','),
        R.head,
      ),
      R.pipe(
        R.path(['metadata', 'annotations']),
        (annotations: Dictionary<string>) => ({
          en: R.propOr('-', 'displayName.en', annotations),
          'zh-CN': R.propOr('-', 'displayName.zh-CN', annotations),
        }),
      ),
      R.pipe(
        R.path(['metadata', 'annotations']),
        (annotations: Dictionary<string>) => ({
          en: R.propOr('-', 'description.en', annotations),
          'zh-CN': R.propOr('-', 'description.zh-CN', annotations),
        }),
      ),
      R.pipe(R.pathOr([], ['spec', 'arguments']), (args: FieldDefine[]) =>
        compileFieldDefines(args, customControlConfigs),
      ),
      R.pipe(
        R.pathOr([], ['spec', 'arguments']),
        R.reduceBy(
          (accum, { name }: FieldDefine) => [...accum, name],
          <string[]>[],
          ({ display: { advanced } }: FieldDefine) =>
            advanced ? 'advanced' : 'basic',
        ),
      ),
    ],
  );

export function fromDatasource(
  pipeline: GraphPipelineConfig,
  taskResources: TaskResoruce[],
  customConfigs: Dictionary<ControlConfig<unknown>>,
) {
  const pipelineFormValues = getPipelineFormValues(pipeline);
  const pipelineForm = getPipelineForm(pipelineFormValues);

  const tasks = R.map(compileTask(customConfigs), taskResources);
  const { parallels, stages, forks } = getPipelineFlow(pipeline);

  const getStageTask = (stage: StageEntity) =>
    R.find(task => `${task.kind}/${task.name}` === stage.task, tasks);
  const getStageValues = (stage: StageEntity) =>
    R.pipe(
      R.view(lenses.graphValues),
      R.prop(stage.name),
      R.map(item => [item.name, item.value]),
      (items: Array<[string, string]>) => R.fromPairs(items),
    )(pipeline);

  const stageForms = R.map(
    R.converge(
      (task, stringValues, stageId: string) => {
        return {
          stageId,
          ...snapshot(stringValues, task),
        };
      },
      [getStageTask, getStageValues, stage => stage.id],
    ),
    stages,
  );

  return {
    pipelineForm: {
      values: pipelineForm.value,
      errors: mergeFormErrors(pipelineForm),
    },
    stageForms,
    parallels,
    stages,
    forks,
    tasks,
  };
}

export function toDatasource(
  project: string,
  parallels: EntityState<{ name: string }>,
  forks: Dictionary<string[]>,
  tasks: EntityState<TaskEntity>,
  stages: EntityState<StageEntity>,
  pipelineForm: PipelineFormState,
  stageForms: EntityState<StageFormEntity>,
) {
  const triggersValue = [
    {
      type: 'codeChange',
      codeChange: {
        enabled: pipelineForm.values.codeChangeEnabled,
        periodicCheck: pipelineForm.values.codeChangePeriodicCheck,
      },
    },
    {
      type: 'cron',
      cron: {
        enabled: pipelineForm.values.cronEnabled,
        rule: pipelineForm.values.cronRule,
      },
    },
  ];

  const stagesValue = R.map(parallelId => {
    const children = forks[parallelId];

    const name =
      parallels.entities[parallelId].name ||
      stages.entities[R.head(children)].name;

    return {
      name,
      tasks: R.map((stageId: string) => {
        const stage = stages.entities[stageId];
        const [kind, name] = R.split('/', stage.task);

        return {
          name,
          id: stage.name,
          kind,
        };
      }, children),
    };
  }, parallels.ids);

  const graphValues = R.reduce(
    (accum: Dictionary<Array<{ name: string; value: string }>>, id: string) => {
      const stage = stages.entities[id];
      const task = tasks.entities[stage.task];
      const form = stageForms.entities[id];

      const values = R.map(field => {
        const value = field.controlConfig.serializor.serialize(
          form.values[field.name],
        );

        return { name: field.name, value };
      }, R.values(task.fields));

      return {
        ...accum,
        [stage.name]: values,
      };
    },
    {},
    stages.ids,
  );

  const mergePipelineSettingValues = R.pipe(
    R.set(lenses.name, pipelineForm.values.name),
    R.set(lenses.displayName, pipelineForm.values.displayName),
    R.set(lenses.jenkinsBinding, pipelineForm.values.jenkinsBinding),
    R.set(lenses.runPolicy, pipelineForm.values.runPolicy),
    R.set(lenses.agent, pipelineForm.values.agent),
    R.set(lenses.triggers, triggersValue),
  );

  const mergeChanges = R.pipe(
    mergePipelineSettingValues,
    R.set(lenses.namespace, project),
    R.set(lenses.stages, stagesValue),
    R.set(lenses.graphValues, graphValues),
  );

  return mergeChanges(pipelineConfigBase);
}

export const getPipelineFormErrors = R.pipe(getPipelineForm, mergeFormErrors);

export function snapshot(
  stringValues: Dictionary<string>,
  { fields }: TaskEntity,
): Omit<StageFormEntity, 'stageId'> {
  const { values, options } = R.reduce(
    ({ values, options }, field) => {
      const stringValue = R.prop(field.name, stringValues);
      const value = field.controlConfig.serializor.deserialize(stringValue);

      const fieldOptions = {
        items: <unknown[]>null,
        pending: !!field.controlConfig.optionsResolver,
      };

      return {
        values: {
          ...values,
          [field.name]: R.isNil(value) ? field.defaultValue : value,
        },
        options: { ...options, [field.name]: fieldOptions },
      };
    },
    {
      values: <Dictionary<unknown>>{},
      options: <Dictionary<{ items: unknown[]; pending: boolean }>>{},
    },
    R.values(fields),
  );

  const formConfig = R.mapObjIndexed(field => {
    const validators =
      field.required && !field.hidden(values)
        ? [Validators.required, ...field.validators]
        : field.validators;

    return new FormControl(R.prop(field.name, values), validators);
  }, fields);

  const errors = mergeFormErrors(new FormGroup(formConfig));

  return {
    values,
    errors,
    options,
  };
}
