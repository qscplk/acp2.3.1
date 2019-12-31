import { FormControl, FormGroup, Validators } from '@angular/forms';
import { UndoableState } from '@app/utils/redux';
import * as R from 'ramda';
import {
  ActionsObservable,
  StateObservable,
  ofType,
} from 'redux-observable-es6-compat';
import { map, withLatestFrom } from 'rxjs/operators';

import {
  EditActions,
  TRY_CHANGE_STAGE_VALUES,
  changeStageValues,
  tryChangeStageValues,
} from '../actions';
import { CompiledFieldDefine } from '../models/form';
import { State, createStageSelector, createTaskSelector } from '../reducers';
import { mergeFormErrors } from '../utils/datasource';

export const tryChangeStageValuesEpic = (
  action$: ActionsObservable<EditActions>,
  state$: StateObservable<UndoableState<State>>,
) =>
  action$.pipe(
    ofType<ReturnType<typeof tryChangeStageValues>>(TRY_CHANGE_STAGE_VALUES),
    withLatestFrom(state$),
    map(([action, state]) => {
      const changes = R.pickBy(
        (value, key) => action.original[key] !== value,
        action.current,
      );

      const selectTaskId = R.pipe(
        createStageSelector(action.id),
        stage => stage.task,
      );

      const taskId = selectTaskId(state);

      const task = createTaskSelector(taskId)(state);

      const affected = R.chain(
        key => getAllAffected(key, task.fields),
        R.keys(changes),
      );

      if (!affected.length) {
        return changeStageValues(action.id, action.current, action.errors);
      }

      const values = R.mapObjIndexed(
        (value, key) => (R.contains(key, affected) ? null : value),
        action.current,
      );

      const formConfig = R.mapObjIndexed(field => {
        const validators =
          field.required && !field.hidden(values)
            ? [Validators.required, ...field.validators]
            : field.validators;

        return new FormControl(R.prop(field.name, values), validators);
      }, task.fields);

      const errors = mergeFormErrors(new FormGroup(formConfig));

      return changeStageValues(action.id, values, errors, affected);
    }),
  );

function getAllAffected(
  fieldName: string,
  fields: Dictionary<CompiledFieldDefine>,
): string[] {
  const affectFields = R.pathOr<string[], string[]>(
    [],
    [fieldName, 'affectFields'],
    fields,
  );

  if (!affectFields.length) {
    return [];
  }

  return R.concat(
    affectFields,
    R.chain(name => getAllAffected(name, fields), affectFields),
  );
}
