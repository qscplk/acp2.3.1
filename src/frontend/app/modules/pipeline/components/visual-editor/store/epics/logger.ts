import { debug } from 'debug';
import {
  ActionsObservable,
  StateObservable,
} from 'redux-observable-es6-compat';
import { empty } from 'rxjs';
import { switchMap, tap, withLatestFrom } from 'rxjs/operators';

export const loggerEpic = (
  action$: ActionsObservable<any>,
  state$: StateObservable<any>,
) =>
  action$.pipe(
    withLatestFrom(state$),
    tap(([action, state]) => {
      debug('redux:action')(action);
      debug('redux:state')(state);
    }),
    switchMap(() => empty()),
  );
