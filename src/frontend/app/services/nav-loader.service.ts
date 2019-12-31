// ! Attention: Copied from https://bitbucket.org/mathildetech/icarus/src/master/src/app/services/nav-loader.service.ts, you should never modify it directly, please ensure to sync it from its source
import { TranslateService } from '@alauda/common-snippet';
import { NavItemConfig, NotificationService } from '@alauda/ui';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import * as jsyaml from 'js-yaml';
import { Observable, concat, of } from 'rxjs';
import { filter, map, shareReplay, switchMap, tap } from 'rxjs/operators';

export const NAV_CONFIG_LOCAL_STORAGE_KEY = new InjectionToken<string>(
  'nav config local storage key',
);

@Injectable({
  providedIn: 'root',
})
export class NavLoaderService {
  private readonly cachedConfig = new Map<string, Observable<string>>();

  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    private readonly notification: NotificationService,
    @Inject(NAV_CONFIG_LOCAL_STORAGE_KEY)
    @Optional()
    private readonly localStorageKey: string = '',
  ) {}

  loadNavConfig(path: string) {
    if (!this.cachedConfig.has(path)) {
      this.cachedConfig.set(path, this.buildLoadStream(path));
    }
    return this.cachedConfig.get(path);
  }

  private buildLoadStream(path: string): Observable<string> {
    return concat(
      of(this.getLocal(path)),
      this.http.get(path, { responseType: 'text' }).pipe(
        tap(config => {
          this.setLocal(path, config);
        }),
      ),
    ).pipe(
      filter(config => !!config),
      shareReplay(1),
    );
  }

  parseYaml() {
    return map<string, NavItem[]>((yaml: string) => {
      let data = [];
      try {
        data = jsyaml.safeLoad(yaml);
      } catch (err) {
        console.error(err);
        this.toastParseError();
      }
      return data;
    });
  }

  mapToAuiNav() {
    return switchMap<NavItem[], Observable<NavItemConfig[]>>(items => {
      return this.translate.locale$.pipe(
        map(() => {
          let data: NavItemConfig[] = [];
          try {
            data = mapNavTree(this.mapToAuiNavItem)(items) as NavItemConfig[];
          } catch (err) {
            console.error(err);
            this.toastParseError();
          }
          return data;
        }),
      );
    });
  }

  private readonly mapToAuiNavItem = (
    navItem: NavItem,
    parents: NavItem[],
  ): NavItemConfig => {
    return {
      key: parents
        .map(item => item.name)
        .concat(navItem.name)
        .join('/'),
      label: navItem.label || this.translate.get(navItem.name),
      name: navItem.name,
      icon: navItem.icon,
      href: navItem.href,
      gate: navItem.gate,
    };
  };

  private toastParseError() {
    this.notification.error(this.translate.get('nav_config_error'));
  }

  private localKey(path: string) {
    const nodes = path.split('/');
    return `${this.localStorageKey}.${nodes[nodes.length - 1]}`;
  }

  private setLocal(path: string, value: string) {
    if (this.localStorageKey) {
      localStorage.setItem(this.localKey(path), value);
    }
  }

  private getLocal(path: string): string {
    if (this.localStorageKey) {
      return localStorage.getItem(this.localKey(path)) || '';
    } else {
      return '';
    }
  }
}

export function mapNavTree(
  fn: (node: NavTree, parents?: NavTree[]) => NavTree,
) {
  const mapper = (nodes: NavTree[], parents: NavTree[] = []): NavTree[] => {
    return nodes.map(node => {
      if (node.children) {
        return {
          ...fn(
            {
              ...node,
            },
            parents,
          ),
          children: mapper(node.children, parents.concat(node)),
        };
      } else {
        return fn(node, parents);
      }
    });
  };
  return mapper;
}

export function first(nodes: NavTree[]): NavTree[] {
  const head = nodes[0];
  if (head) {
    return head.children ? [head, ...first(head.children)] : [head];
  } else {
    return [];
  }
}

export interface NavTree {
  [key: string]: any;
  children?: NavTree[];
}

export interface NavItem {
  name: string;
  icon?: string;
  label?: string;
  href?: string;
  children?: NavItem[];
  gate?: string;
}
