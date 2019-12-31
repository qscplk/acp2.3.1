import { Injectable, OnDestroy } from '@angular/core';
import { AnyAction, applyMiddleware, createStore } from 'redux';
import { createEpicMiddleware } from 'redux-observable-es6-compat';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { rootEpic } from './epics';
import { reducer } from './reducers';

const epicMiddleware = createEpicMiddleware();

@Injectable()
export class PipelineVisualEditorStoreService implements OnDestroy {
  constructor() {
    epicMiddleware.run(rootEpic);
  }

  private readonly store = createStore(
    reducer,
    applyMiddleware(epicMiddleware),
  );

  private readonly state$ = new BehaviorSubject(this.store.getState());

  private readonly unsubscribeState = this.store.subscribe(() => {
    this.state$.next(this.store.getState());
  });

  select<T>(
    selector: (state: ReturnType<typeof reducer>) => T,
    comparator: (a: T, b: T) => boolean = (a, b) => a === b,
  ) {
    return this.state$.pipe(map(selector), distinctUntilChanged(comparator));
  }

  dispatch = <TAction extends AnyAction>(action: TAction) =>
    this.store.dispatch(action);

  ngOnDestroy() {
    this.unsubscribeState();
  }
}
