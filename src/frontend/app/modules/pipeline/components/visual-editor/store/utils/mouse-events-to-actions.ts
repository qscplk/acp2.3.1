import * as R from 'ramda';
import { Observable, merge, of } from 'rxjs';
import {
  delay,
  filter,
  map,
  pairwise,
  publish,
  refCount,
  skipWhile,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { move, scale, stopMove, stopScale } from '../actions';

export const filterEventByType = (type: string) => <
  T extends MouseEvent | WheelEvent,
  S extends T
>(
  source$: Observable<S>,
) =>
  source$.pipe(
    filter(event => event.type === type),
    publish<T>(), // for events, never need replay.
    refCount(),
  );

const moveLeaseThen = (distance: number, startX: number, startY: number) => ({
  clientX: x,
  clientY: y,
}: MouseEvent) =>
  Math.sqrt(Math.pow(startX - x, 2) + Math.pow(startY - y, 2)) < distance;

export function mouseEventsToActions(
  events$: Observable<MouseEvent | WheelEvent>,
) {
  const mousedown$ = events$.pipe<MouseEvent>(filterEventByType('mousedown'));
  const mouseup$ = events$.pipe<MouseEvent>(filterEventByType('mouseup'));
  const mousemove$ = events$.pipe<MouseEvent>(filterEventByType('mousemove'));
  const wheel$ = events$
    .pipe<WheelEvent>(filterEventByType('wheel'))
    .pipe(tap(event => event.preventDefault()));

  const move$ = mousedown$.pipe(
    switchMap(({ clientX: startX, clientY: startY }) =>
      mousemove$.pipe(
        takeUntil(mouseup$.pipe(take(1))),
        skipWhile(moveLeaseThen(5, startX, startY)),
        pairwise(),
        map(([prev, current]) => {
          return {
            x: current.clientX - prev.clientX,
            y: current.clientY - prev.clientY,
          };
        }),
        map(({ x, y }) => move(x, y, false)),
      ),
    ),
  );

  const stopMove$ = mousedown$.pipe(
    switchMap(() => mouseup$.pipe(take(1))),
    map(() => stopMove()),
  );

  const scale$ = wheel$.pipe(
    map(event => {
      const currentTarget = <Element>event.currentTarget;

      const { left, top } = R.head(currentTarget.getClientRects());
      const originX = event.clientX - left;
      const originY = event.clientY - top;

      const ratio = -event.deltaY * 0.005;

      return scale(ratio, originX, originY, false);
    }),
    publish(),
    refCount(),
  );

  const stopScale$ = scale$.pipe(
    switchMap(() => of(null).pipe(delay(200))),
    map(() => stopScale()),
  );

  return merge(move$, stopMove$, scale$, stopScale$);
}
