import { createEntityAdapter } from '@app/utils/redux';
import * as R from 'ramda';

import {
  EditActions,
  RESET_PIPELINE,
  SET_TASKS,
  TaskActions,
} from '../actions';
import { TaskEntity, TaskGroup } from '../models/form';

const adapter = createEntityAdapter<TaskEntity>(
  task => `${task.kind}/${task.name}`,
);

const defaultValue = {
  all: adapter.reset([]),
  groups: <Dictionary<TaskGroup>>{},
};

export type TasksState = typeof defaultValue;

export function reducer(
  state = defaultValue,
  action: TaskActions | EditActions,
) {
  switch (action.type) {
    case RESET_PIPELINE:
    case SET_TASKS:
      const groups = R.reduceBy(
        ({ translates, tasks }, task) => ({
          translates: translates || task.groupTranslates,
          tasks: [...tasks, `${task.kind}/${task.name}`],
        }),
        {
          translates: null,
          tasks: [],
        },
        task => task.group,
        action.tasks,
      );

      return {
        groups,
        all: adapter.reset(action.tasks),
      };
    default:
      return state;
  }
}

export const selectGroups = (state: TasksState) => state.groups;

export const createTaskSelector = (id: string) => (state: TasksState) =>
  adapter.get(state.all, id);
