import { UndoableState } from '@app/utils/redux';
import * as R from 'ramda';
import {
  ActionsObservable,
  StateObservable,
  ofType,
} from 'redux-observable-es6-compat';
import { empty, forkJoin, isObservable, of } from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

import {
  ADD_PARALLEL_BY_STAGE,
  ADD_STAGE,
  CHANGE_STAGE_VALUES,
  EditActions,
  SELECT,
  receiveStageOptions,
} from '../actions';
import { State, createStageFormAndTask } from '../reducers';

const getSelectedId = R.pipe(R.split('/'), ([prefix, id]) => {
  if (prefix !== 'stage') {
    return null;
  }

  return id;
});

export const loadOptionsEpic = (
  action$: ActionsObservable<EditActions>,
  state$: StateObservable<UndoableState<State>>,
) =>
  action$.pipe(
    ofType(SELECT, CHANGE_STAGE_VALUES, ADD_STAGE, ADD_PARALLEL_BY_STAGE),
    map(action => {
      switch (action.type) {
        case SELECT:
          return getSelectedId(action.path);
        case CHANGE_STAGE_VALUES:
          if (!action.affected.length) {
            return null;
          }
          return action.id;
        case ADD_STAGE:
          return action.stage.id;
        case ADD_PARALLEL_BY_STAGE:
          return action.stage.id;
        default:
          return null;
      }
    }),
    filter(id => !!id),
    withLatestFrom(state$),
    switchMap(([id, state]) => {
      const { form, task } = createStageFormAndTask(id)(state);

      const pendingOptions = R.pickBy(
        (value: { pending: boolean }) => value.pending,
        form.options,
      );

      const pendingFields = R.map(
        fieldName => task.fields[fieldName],
        R.keys(pendingOptions),
      );

      if (!pendingFields.length) {
        return empty();
      }

      return forkJoin(
        R.map(field => {
          const resolved = field.controlConfig.optionsResolver(
            form.values[field.related],
            {
              state: form.values,
              args: field.args,
              relatedField: field.related,
            },
          );

          if (isObservable(resolved)) {
            return resolved.pipe(
              catchError(() => of([])),
              map(options => [field.name, options]),
            );
          } else {
            return of([field.name, resolved]);
          }
        }, pendingFields),
      ).pipe(
        map((allOptions: Array<[string, unknown[]]>) => {
          return receiveStageOptions(id, R.fromPairs(allOptions));
        }),
      );
    }),
  );
