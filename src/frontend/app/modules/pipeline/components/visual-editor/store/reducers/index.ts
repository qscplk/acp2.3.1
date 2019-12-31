import {
  UndoableState,
  activeState,
  createEntitySelector,
  undoable,
} from '@app/utils/redux';
import * as R from 'ramda';
import { combineReducers } from 'redux';

import {
  EditActions,
  MOVE,
  NavigatorActions,
  RECEIVE_STAGE_OPTIONS,
  REMOVE_PARALLEL,
  REMOVE_STAGE,
  RESET_AND_SCALE,
  SCALE,
  SELECT,
  SET_TASKS,
  STOP_MOVE,
  STOP_SCALE,
  TRY_CHANGE_STAGE_VALUES,
  TaskActions,
  removeParallel,
  removeStage,
  resetPipeline,
} from '../actions';
import { FormEntity, StageFormEntity, TaskEntity } from '../models/form';
import { ParallelEntity, StageEntity } from '../models/graph';

import * as forks from './forks';
import * as navigator from './navigator';
import * as parallels from './parallels';
import * as pipelineForm from './pipeline-form';
import * as selected from './selected';
import * as stageForms from './stage-forms';
import * as stages from './stages';
import * as tasks from './tasks';

const combined = combineReducers({
  pipelineForm: pipelineForm.reducer,
  stageForms: stageForms.reducer,
  parallels: parallels.reducer,
  stages: stages.reducer,
  forks: forks.reducer,
  selected: selected.reducer,
  navigator: navigator.reducer,
  tasks: tasks.reducer,
});

export type State = ReturnType<typeof combined>;

export type ActiveStateSelector = (state: UndoableState<State>) => State;

function internalReducer(
  state: State,
  action: EditActions | TaskActions | NavigatorActions,
) {
  const newState = combined(state, action);

  if (newState === state) {
    return newState;
  }

  switch (action.type) {
    case REMOVE_STAGE:
      const parallelId = action.parent;

      if (!newState.forks[parallelId]) {
        return combined(newState, removeParallel(parallelId));
      }

      return newState;
    case REMOVE_PARALLEL:
      const forks = state.forks[action.id];
      const removeStageActions = R.map(
        fork => removeStage(fork, action.id),
        forks,
      );
      return R.reduce(combined, newState, removeStageActions);
    default:
      return newState;
  }
}

export const reducer = undoable(internalReducer, {
  reset: resetPipeline,
  stackSize: 1, // temp disable undoable
  ignoreActions: [
    MOVE,
    SCALE,
    STOP_MOVE,
    STOP_SCALE,
    RESET_AND_SCALE,
    SET_TASKS,
    SELECT,
    RECEIVE_STAGE_OPTIONS,
    TRY_CHANGE_STAGE_VALUES,
  ],
});

export const selectDiagramDefines = R.pipe(
  <ActiveStateSelector>activeState,
  ({
    parallels: { ids, entities: parallels },
    stages: { entities: stages },
    forks,
  }: State) => ({ mainFlow: ids, forks, parallels, stages }),
);

export const selectSelected = R.pipe(
  <ActiveStateSelector>activeState,
  ({ selected }) => selected,
);

export const selectNavigator = R.pipe(
  <ActiveStateSelector>activeState,
  ({ navigator }) => navigator,
);

export const createStageSelector = (id: string) =>
  R.pipe(
    <ActiveStateSelector>activeState,
    R.prop('stages'),
    createEntitySelector<StageEntity>(id),
  );

export const createStageNameDuplicateSelector = (name: string) =>
  R.pipe(
    <ActiveStateSelector>activeState,
    R.path(['stages', 'entities']),
    R.pickBy((item: StageEntity) => item.name === name),
    picked => Object.keys(picked).length > 1,
  );

const getParallelName = (item: ParallelEntity, state: State) => {
  const {
    forks,
    stages: { entities: stages },
  } = state;
  if (item.name) {
    return item.name;
  }

  const parallelForks = forks[item.id];

  if (!parallelForks.length) {
    return '';
  }

  const firstStageId = R.head(parallelForks);

  if (stages[firstStageId]) {
    return stages[firstStageId].name;
  }
};

export const createParallelNameDuplicateSelector = (name: string) =>
  R.pipe(
    <ActiveStateSelector>activeState,
    R.converge(
      (parallels: Dictionary<ParallelEntity>, state: State) => {
        const picked = R.pickBy(
          (item: ParallelEntity) => getParallelName(item, state) === name,
          parallels,
        );

        return Object.keys(picked).length > 1;
      },
      [R.path(['parallels', 'entities']), R.identity],
    ),
  );

export const createParallelSelector = (id: string) =>
  R.pipe(
    <ActiveStateSelector>activeState,
    R.prop('parallels'),
    createEntitySelector<ParallelEntity>(id),
  );

export const createStageFormSelector = (id: string) =>
  R.pipe(
    <ActiveStateSelector>activeState,
    R.prop('stageForms'),
    createEntitySelector<StageFormEntity>(id),
  );

export const selectPipelineForm = R.pipe(
  <ActiveStateSelector>activeState,
  R.prop('pipelineForm'),
);

export const selectTaskGroups = R.pipe(
  <ActiveStateSelector>activeState,
  R.prop('tasks'),
  tasks.selectGroups,
);

export const createTaskSelector = (id: string) =>
  R.pipe(
    <(state: UndoableState<State>) => State>activeState,
    R.prop('tasks'),
    tasks.createTaskSelector(id),
  );

export const selectValid = R.pipe(
  <ActiveStateSelector>activeState,
  R.converge(
    (
      noErrorSetting: boolean,
      noErrorField: boolean,
      allNameFilled: boolean,
      noDuplicateStageName: boolean,
      noDuplicateParallelName: boolean,
    ) =>
      noErrorSetting &&
      noErrorField &&
      allNameFilled &&
      noDuplicateStageName &&
      noDuplicateParallelName,
    [
      R.pipe(R.prop('pipelineForm'), (form: FormEntity) => !form.errors),
      R.pipe(
        R.path(['stageForms', 'entities']),
        R.values,
        R.all((form: StageFormEntity) => !form.errors),
      ),
      R.pipe(
        R.path(['stages', 'entities']),
        R.values,
        R.all((stage: StageEntity) => !!stage.name),
      ),
      R.pipe(
        R.path(['stages', 'entities']),
        R.values,
        (items: StageEntity[]) =>
          R.uniqBy(value => value.name, items).length === items.length,
      ),
      R.converge(
        (parallels: ParallelEntity[], state: State) => {
          return (
            R.uniqBy(parallel => getParallelName(parallel, state), parallels)
              .length === parallels.length
          );
        },
        [R.pipe(R.path(['parallels', 'entities']), R.values), R.identity],
      ),
    ],
  ),
);

export const createStageFormAndTask = (id: string) =>
  R.converge(
    (taskId: string, tasks: Dictionary<TaskEntity>, form: StageFormEntity) => {
      const task = tasks[taskId];

      return {
        form,
        task,
      };
    },
    [
      R.pipe(createStageSelector(id), R.prop('task')),
      R.pipe(
        <ActiveStateSelector>activeState,
        R.path(['tasks', 'all', 'entities']),
      ),
      createStageFormSelector(id),
    ],
  );

// with default to first stage name, alwaysWithDefault for diagram display
export const createParallelNameSelector = (
  id: string,
  alwaysWithDefault = false,
) =>
  R.converge(
    (
      parallel: ParallelEntity,
      firstStageId: string,
      state: UndoableState<State>,
    ) => {
      if (!parallel) {
        return '';
      }

      if (parallel.name) {
        return parallel.name;
      }

      if (parallel.nameEdited && !alwaysWithDefault) {
        return '';
      }

      if (!firstStageId) {
        return '';
      }

      const getStage = createStageSelector(firstStageId);

      return R.propOr('', 'name', getStage(state));
    },
    [
      createParallelSelector(id),
      R.pipe(
        <ActiveStateSelector>activeState,
        R.pathOr([], ['forks', id]),
        R.head,
      ),
      R.identity,
    ],
  );
