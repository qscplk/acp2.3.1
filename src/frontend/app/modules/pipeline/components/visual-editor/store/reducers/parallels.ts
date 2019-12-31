import { createEntityAdapter } from '@app/utils/redux';

import {
  ADD_PARALLEL_BY_STAGE,
  CHANGE_PARALLEL_NAME,
  CLEAR_PIPELINE,
  EditActions,
  REMOVE_PARALLEL,
  RESET_PIPELINE,
} from '../actions';
import { ParallelEntity } from '../models/graph';

const adapter = createEntityAdapter((item: ParallelEntity) => item.id);

const defaultValue = adapter.reset([]);

export type ParallelsState = typeof defaultValue;

export function reducer(state = defaultValue, action: EditActions) {
  switch (action.type) {
    case CLEAR_PIPELINE:
      return defaultValue;
    case RESET_PIPELINE:
      return adapter.reset(action.parallels);
    case ADD_PARALLEL_BY_STAGE:
      return adapter.insertAfter(state, action.after, {
        name: action.stage.name,
        id: action.stage.id,
        nameEdited: false,
      });
    case REMOVE_PARALLEL:
      return adapter.remove(state, action.id);
    case CHANGE_PARALLEL_NAME:
      return adapter.update(state, action.id, {
        name: action.name,
        nameEdited: true,
      });
    default:
      return state;
  }
}
