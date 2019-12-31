import {
  animate,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { ActivatedRoute } from '@angular/router';

export const routerTransition = trigger('routerTransition', [
  transition('* <=> *', [
    group([
      query(
        ':enter',
        [
          style({ transform: 'scale(0.95)', opacity: 0.75 }),
          animate(
            '0.5s ease-in-out',
            style({ transform: 'scale(1)', opacity: 1 }),
          ),
        ],
        { optional: true },
      ),
    ]),
  ]),
]);

export const getRouteConfigPathFromRoot = (route: ActivatedRoute): string => {
  if (route.parent.routeConfig) {
    return `${getRouteConfigPathFromRoot(route.parent)}/${
      route.routeConfig.path
    }`;
  }

  return route.routeConfig.path;
};
