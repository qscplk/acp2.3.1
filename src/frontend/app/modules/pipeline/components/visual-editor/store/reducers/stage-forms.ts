import { createEntityAdapter } from '@app/utils/redux';
import * as R from 'ramda';

import {
  ADD_PARALLEL_BY_STAGE,
  ADD_STAGE,
  CHANGE_STAGE_VALUES,
  CLEAR_PIPELINE,
  EditActions,
  RECEIVE_STAGE_OPTIONS,
  REMOVE_STAGE,
  RESET_PIPELINE,
} from '../actions';
import { StageFormEntity } from '../models/form';

const adapter = createEntityAdapter((item: StageFormEntity) => item.stageId);

const defaultValue = adapter.reset([]);

export type StageFormsState = typeof defaultValue;

export function reducer(state = defaultValue, action: EditActions) {
  switch (action.type) {
    case CLEAR_PIPELINE:
      return defaultValue;
    case RESET_PIPELINE:
      return adapter.reset(action.stageForms);
    case ADD_PARALLEL_BY_STAGE:
      return adapter.append(state, action.form);
    case ADD_STAGE:
      return adapter.append(state, action.form);
    case REMOVE_STAGE:
      return adapter.remove(state, action.id);
    case CHANGE_STAGE_VALUES:
      const originalOptions = adapter.get(state, action.id).options;

      const options = action.affected.length
        ? R.mapObjIndexed((value, key) => {
            if (action.affected.includes(key)) {
              return {
                items: null,
                pending: true,
              };
            }

            return value;
          }, originalOptions)
        : originalOptions;

      return adapter.update(state, action.id, {
        values: action.values,
        errors: action.errors,
        options,
        edited: true,
      });

    case RECEIVE_STAGE_OPTIONS: {
      const originalOptions = adapter.get(state, action.id).options;

      return adapter.update(state, action.id, {
        options: R.merge(
          originalOptions,
          R.mapObjIndexed(
            items => ({
              items,
              pending: false,
            }),
            action.optionsByField,
          ),
        ),
      });
    }
    default:
      return state;
  }
}
