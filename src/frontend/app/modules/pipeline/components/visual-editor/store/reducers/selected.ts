import {
  ADD_PARALLEL_BY_STAGE,
  ADD_STAGE,
  EditActions,
  REMOVE_PARALLEL,
  REMOVE_STAGE,
  SELECT,
} from '../actions';

const defaultValue = '';

export type SelectedState = typeof defaultValue;

export function reducer(state = defaultValue, action: EditActions) {
  switch (action.type) {
    case SELECT:
      return action.path;
    case ADD_STAGE:
      return `stage/${action.stage.id}`;
    case ADD_PARALLEL_BY_STAGE:
      return `stage/${action.stage.id}`;
    case REMOVE_STAGE:
    case REMOVE_PARALLEL:
      return defaultValue;
    default:
      return state;
  }
}
