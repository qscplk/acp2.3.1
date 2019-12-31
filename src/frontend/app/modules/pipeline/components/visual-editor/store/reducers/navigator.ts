import {
  MOVE,
  NavigatorActions,
  RESET_AND_SCALE,
  SCALE,
  STOP_MOVE,
  STOP_SCALE,
} from '../actions';

const defaultValue = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  moving: false,
  scaling: false,
};

export const SCALE_MIN = 0.2;
export const SCALE_MAX = 2;

export type NavigatorState = typeof defaultValue;

export function reducer(state = defaultValue, action: NavigatorActions) {
  switch (action.type) {
    case MOVE:
      return {
        ...state,
        offsetX: state.offsetX + action.x,
        offsetY: state.offsetY + action.y,
        moving: !action.immediate,
      };
    case SCALE:
      const newScale = Math.min(
        SCALE_MAX,
        Math.max(SCALE_MIN, state.scale + action.ratio),
      );
      const { originX, originY } = action;
      const { offsetX, offsetY } = state;

      return {
        ...state,
        offsetX: originX - ((originX - offsetX) * newScale) / state.scale,
        offsetY: originY - ((originY - offsetY) * newScale) / state.scale,
        scale: newScale,
        scaling: !action.immediate,
      };
    case STOP_MOVE:
      return {
        ...state,
        moving: false,
      };
    case STOP_SCALE:
      return {
        ...state,
        scaling: false,
      };
    case RESET_AND_SCALE:
      return {
        offsetX: action.offsetX,
        offsetY: action.offsetY,
        scale: action.ratio,
        scaling: false,
        moving: false,
      };
    default:
      return state;
  }
}
