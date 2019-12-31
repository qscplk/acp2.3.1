export const MOVE = <const>'move';
export const SCALE = <const>'scale';
export const STOP_MOVE = <const>'stop move';
export const STOP_SCALE = <const>'stop scale';
export const RESET_AND_SCALE = <const>'reset and scale to';

export function scale(
  ratio: number,
  originX: number,
  originY: number,
  immediate = true,
) {
  return <const>{
    type: SCALE,
    ratio,
    originX,
    originY,
    immediate,
  };
}

export function move(x: number, y: number, immediate = true) {
  return <const>{
    type: MOVE,
    x,
    y,
    immediate,
  };
}

export function stopMove() {
  return <const>{ type: STOP_MOVE };
}

export function stopScale() {
  return <const>{ type: STOP_SCALE };
}

// for 1:1 and fit size
export function resetAndScale(ratio: number, offsetX: number, offsetY: number) {
  return <const>{
    type: RESET_AND_SCALE,
    ratio,
    offsetX,
    offsetY,
  };
}

export type NavigatorActions = ReturnType<
  | typeof scale
  | typeof move
  | typeof stopMove
  | typeof stopScale
  | typeof resetAndScale
>;
