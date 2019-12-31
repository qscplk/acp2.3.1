import { createEntityAdapter } from '@app/utils/redux';

import {
  ADD_PARALLEL_BY_STAGE,
  ADD_STAGE,
  CHANGE_STAGE_NAME,
  CLEAR_PIPELINE,
  EditActions,
  REMOVE_STAGE,
  RESET_PIPELINE,
} from '../actions';
import { StageEntity } from '../models/graph';

const adapter = createEntityAdapter((item: StageEntity) => item.id);

const defaultValue = adapter.reset([]);

export type StagesState = typeof defaultValue;

export function reducer(state = defaultValue, action: EditActions) {
  switch (action.type) {
    case CLEAR_PIPELINE:
      return defaultValue;
    case RESET_PIPELINE:
      return adapter.reset(action.stages);
    case ADD_STAGE:
      return adapter.append(state, action.stage);
    case ADD_PARALLEL_BY_STAGE:
      return adapter.append(state, action.stage);
    case REMOVE_STAGE:
      return adapter.remove(state, action.id);
    case CHANGE_STAGE_NAME:
      return adapter.update(state, action.id, {
        name: action.name,
        edited: true,
      });
    default:
      return state;
  }
}
