import * as R from 'ramda';

import {
  ADD_PARALLEL_BY_STAGE,
  ADD_STAGE,
  CLEAR_PIPELINE,
  EditActions,
  REMOVE_PARALLEL,
  REMOVE_STAGE,
  RESET_PIPELINE,
} from '../actions';

const defaultValue = <Dictionary<string[]>>{};

export type ForksState = typeof defaultValue;

export function reducer(state = defaultValue, action: EditActions) {
  switch (action.type) {
    case CLEAR_PIPELINE:
      return defaultValue;
    case RESET_PIPELINE:
      return action.forks;
    case ADD_PARALLEL_BY_STAGE:
      return {
        ...state,
        [action.stage.id]: [action.stage.id],
      };
    case ADD_STAGE:
      return {
        ...state,
        [action.parallel]: [...state[action.parallel], action.stage.id],
      };
    case REMOVE_STAGE:
      const forks = state[action.parent];

      if (!forks) {
        return state;
      }

      const stages = forks.filter(stage => stage !== action.id);

      if (!stages.length) {
        return R.omit([action.parent], state);
      }
      return {
        ...state,
        [action.parent]: stages,
      };
    case REMOVE_PARALLEL:
      return R.omit([action.id], state);
    default:
      return state;
  }
}
