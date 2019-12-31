import { ValidationErrors } from '@angular/forms';
import { v1 as uuid } from 'uuid';

import { FormEntity, StageFormEntity, TaskEntity } from '../models/form';
import { ParallelEntity, StageEntity } from '../models/graph';

export const CLEAR_PIPELINE = <const>'clear pipeline';
export const RESET_PIPELINE = <const>'reset pipeline';
export const ADD_PARALLEL_BY_STAGE = <const>'add parallel by stage';
export const REMOVE_PARALLEL = <const>'remove parallel';
export const ADD_STAGE = <const>'add stage';
export const REMOVE_STAGE = <const>'remove stage';
export const CHANGE_STAGE_NAME = <const>'change stage name';
export const CHANGE_PARALLEL_NAME = <const>'change parallel name';
export const CHANGE_STAGE_VALUES = <const>'change stage values';
export const TRY_CHANGE_STAGE_VALUES = <const>'try change stage values';
export const RECEIVE_STAGE_OPTIONS = <const>'receive stage options';
export const CHANGE_PIPELINE_SETTINGS = <const>'change pipeline settings';
export const SELECT = <const>'select';

export function clearPipeline() {
  return <const>{
    type: CLEAR_PIPELINE,
  };
}

export function resetPipeline({
  pipelineForm,
  stageForms,
  parallels,
  stages,
  forks,
  tasks,
}: {
  pipelineForm: FormEntity;
  stageForms: StageFormEntity[];
  parallels: ParallelEntity[];
  stages: StageEntity[];
  forks: Dictionary<string[]>;
  tasks: TaskEntity[];
}) {
  return <const>{
    type: RESET_PIPELINE,
    pipelineForm,
    stageForms,
    parallels,
    stages,
    forks,
    tasks,
  };
}

export function addParallelByStage(
  task: TaskEntity,
  after: string,
  form: Omit<StageFormEntity, 'stageId'>,
) {
  const id = uuid();

  return <const>{
    type: ADD_PARALLEL_BY_STAGE,
    stage: {
      id,
      name: '',
      parent: id,
      task: `${task.kind}/${task.name}`,
    },
    after,
    form: { ...form, stageId: id },
  };
}

export function removeParallel(id: string) {
  return <const>{
    type: REMOVE_PARALLEL,
    id,
  };
}

export function addStage(
  task: TaskEntity,
  parallel: string,
  form: Omit<StageFormEntity, 'stageId'>,
) {
  const id = uuid();

  return {
    type: ADD_STAGE,
    stage: {
      id,
      name: '',
      parent: parallel,
      task: `${task.kind}/${task.name}`,
    },
    parallel,
    form: { ...form, stageId: id },
  };
}

export function removeStage(id: string, parent: string) {
  return <const>{
    type: REMOVE_STAGE,
    id,
    parent,
  };
}

export function changeStageName(id: string, name: string) {
  return <const>{
    type: CHANGE_STAGE_NAME,
    id,
    name,
  };
}

export function tryChangeStageValues(
  id: string,
  original: Dictionary<unknown>,
  current: Dictionary<unknown>,
  errors: Dictionary<ValidationErrors>,
) {
  return <const>{
    type: TRY_CHANGE_STAGE_VALUES,
    id,
    original,
    current,
    errors,
  };
}

export function changeStageValues(
  id: string,
  values: Dictionary<unknown>,
  errors: Dictionary<ValidationErrors>,
  affected: string[] = [],
) {
  return <const>{
    type: CHANGE_STAGE_VALUES,
    id,
    values,
    errors,
    affected,
  };
}

export function receiveStageOptions(
  id: string,
  optionsByField: Dictionary<unknown[]>,
) {
  return <const>{
    type: RECEIVE_STAGE_OPTIONS,
    id,
    optionsByField,
  };
}

export function changeParallelName(id: string, name: string) {
  return <const>{
    type: CHANGE_PARALLEL_NAME,
    id,
    name,
  };
}

export function changePipelineSettings(form: FormEntity) {
  return <const>{
    type: CHANGE_PIPELINE_SETTINGS,
    form,
  };
}

export function select(path: string) {
  return <const>{
    type: SELECT,
    path,
  };
}

export type EditActions = ReturnType<
  // tslint:disable-next-line:max-union-size
  | typeof clearPipeline
  | typeof resetPipeline
  | typeof addParallelByStage
  | typeof removeParallel
  | typeof addStage
  | typeof removeStage
  | typeof changeStageName
  | typeof tryChangeStageValues
  | typeof changeStageValues
  | typeof receiveStageOptions
  | typeof changeParallelName
  | typeof changePipelineSettings
  | typeof select
>;
