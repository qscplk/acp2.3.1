import * as R from 'ramda';
import { Action, AnyAction, Reducer } from 'redux';

export interface UndoableState<T> {
  stack: T[];
  index: number;
}

const UNDO = <const>'undo';
const REDO = <const>'redo';
const RESET = <const>'reset';

export function undo() {
  return <const>{ type: UNDO };
}

export function redo() {
  return <const>{ type: REDO };
}

export function reset(...args: unknown[]) {
  return <const>{ type: RESET, args };
}

export type UndoActions = ReturnType<typeof undo | typeof redo | typeof reset>;

export interface UndoableOptions<TAction> {
  stackSize: number;
  ignoreActions: string[];
  reset: (...args: unknown[]) => TAction;
}

export function undoable<T, TAction extends Action<string> = AnyAction>(
  reducer: Reducer<T, TAction>,
  options: Partial<UndoableOptions<TAction>> = {},
): Reducer<UndoableState<T>, TAction | UndoActions> {
  const { ignoreActions, stackSize } = {
    stackSize: 50,
    ignoreActions: <string[]>[],
    ...options,
  };

  return (state: UndoableState<T>, action: AnyAction) => {
    switch (action.type) {
      case UNDO: {
        const { index, stack } = state;

        if (index < 1 || !stack || stack.length <= 1) {
          return state;
        }

        return {
          stack,
          index: state.index - 1,
        };
      }
      case REDO: {
        const { index, stack } = state;

        if (index + 1 >= stack.length) {
          return state;
        }

        return {
          stack,
          index: index + 1,
        };
      }
      case RESET: {
        if (!options.reset) {
          return {
            stack: [R.head(state.stack)],
            index: 0,
          };
        }

        const original = activeState(state);

        const newState = reducer(original, options.reset(...action.args));

        return {
          stack: [newState],
          index: 0,
        };
      }
      default: {
        if (!state) {
          return {
            stack: [reducer(undefined, <TAction>action)],
            index: 0,
          };
        }

        const { stack, index } = state;
        const original = activeState(state);
        const newState = reducer(original, <TAction>action);

        if (newState === original) {
          return state;
        }

        if (ignoreActions.includes(action.type)) {
          const newStack = [...stack];
          newStack.splice(index, 1, newState);

          return {
            stack: newStack,
            index,
          };
        } else {
          const remains = stack.slice(0, index + 1);
          const newStack = R.takeLast(stackSize, [...remains, newState]);

          return {
            stack: newStack,
            index: newStack.length - 1,
          };
        }
      }
    }
  };
}

export function isUndoable<T>(state: UndoableState<T>) {
  return state && state.index >= 1;
}

export function isRedoable<T>(state: UndoableState<T>) {
  return state && state.index < (state.stack || []).length - 1;
}

export function activeState<T>(state: UndoableState<T>) {
  const { stack, index } = state;
  return stack[index];
}
