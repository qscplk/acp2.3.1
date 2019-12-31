import {
  FeatureGateService,
  NamespaceIdentity,
  TranslateService,
  createRecursiveFilter,
} from '@alauda/common-snippet';
import { ThemeService } from '@alauda/theme';
import { NavItemConfig } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  getRouteConfigPathFromRoot,
  routerTransition,
} from '@app/router-transition';
import {
  LatestVisitedService,
  NavControlService,
  TemplateHolderType,
  UiStateService,
} from '@app/services';
import { BehaviorSubject, Subject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  publishReplay,
  refCount,
  startWith,
  takeUntil,
} from 'rxjs/operators';

const baseUrl = '/workspace';

@Component({
  templateUrl: 'workspace.component.html',
  styleUrls: ['workspace.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routerTransition],
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  hide: boolean;
  filter$ = new BehaviorSubject<string>('');
  defaultConfigs = this.navControl.getUserViewNavConfigs();
  onDestroy$ = new Subject<void>();

  pageHeaderContentTemplate$ = this.uiState.getTemplateHolder(
    TemplateHolderType.PageHeaderContent,
  ).templatePortal$;

  get language() {
    return this.translate.locale;
  }

  get currentProject() {
    return this.route.snapshot.paramMap.get('project');
  }

  currentNamespace$ = this.latestVisited.namespace$;

  showLoadingBar$ = this.uiState.showLoadingBar$;

  configs$ = this.defaultConfigs.pipe(
    distinctUntilChanged(),
    map(navConfigs => navConfigs.map(config => this.mapConfig(config))),
    publishReplay(1),
    refCount(),
  );

  activated$ = combineLatest([
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.url),
      startWith(this.router.url),
      distinctUntilChanged(),
      map(getUrlKey),
    ),
    this.configs$.pipe(map(configs => this.flatConfigs(configs))),
  ]).pipe(
    map(([url, configs]) => {
      const matchedConfig = configs.find(config => url.startsWith(config.key));
      if (matchedConfig) {
        return {
          ...matchedConfig,
          key: matchedConfig.key,
          label: matchedConfig.label,
        };
      }
      return {
        ...matchedConfig,
        key: '',
        label: this.translate.get('error'),
      };
    }),
    distinctUntilChanged(),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly uiState: UiStateService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly navControl: NavControlService,
    public themeService: ThemeService,
    private readonly latestVisited: LatestVisitedService,
    private readonly title: Title,
    private readonly featureGate: FeatureGateService,
  ) {
    this.hide = false;
  }

  ngOnInit(): void {
    this.activated$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((activated: NavItemConfig) => {
        this.title.setTitle(activated.label);
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.latestVisited.clearNamespace();
  }

  getActivatedKey(activated: NavItemConfig) {
    if (activated) {
      return activated.key;
    }
    return '';
  }

  toggleLanguage() {
    this.translate.toggleLocale();
  }

  getPage(outlet: RouterOutlet) {
    return getRouteConfigPathFromRoot(outlet.activatedRoute);
  }

  handleActivatedNavItemChange(item: NavItemConfig) {
    if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
      window.open(item.href, '_blank');
    } else {
      this.router.navigate([
        baseUrl,
        this.currentProject,
        ...item.href.split('/'),
      ]);
    }
  }

  handleActivatedNamespacedNavItemChange(
    item: NavItemConfig,
    namespace: NamespaceIdentity,
  ) {
    if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
      window.open(item.href, '_blank');
    } else {
      if (!namespace) {
        this.router.navigate([baseUrl, this.currentProject, 'no-namespace']);
        return;
      }

      this.router.navigate([
        baseUrl,
        this.currentProject,
        'clusters',
        namespace.cluster,
        'namespaces',
        namespace.name,
        ...item.href.split('/'),
      ]);
    }
  }

  projectSwitchHandle(name: string) {
    this.latestVisited.clearNamespace();
    this.router.navigate([baseUrl, name, 'overview']).then(() => {
      this.hide = true;
    });
  }

  namespaceSwitchHandle(namespace: NamespaceIdentity) {
    this.latestVisited.setNamespace(namespace);
  }

  global(configs: NavItemConfig[]) {
    return (configs || []).filter(config => !isNamespaced(config));
  }

  namespaced(configs: NavItemConfig[]) {
    return (configs || []).filter(isNamespaced);
  }

  filterEnabled = (items: NavItemConfig[], cluster = '') => {
    return this.featureGate.filterEnabled(
      items,
      item => item.gate,
      cluster,
      createRecursiveFilter(
        item => item.children,
        (item, children) => ({ ...item, children }),
      ),
    );
  };

  private flatConfigs<T extends NavItemConfig>(items: T[]): T[] {
    return items.reduce(
      (prevValue, currValue) => [
        ...prevValue,
        ...(currValue.children
          ? this.flatConfigs(currValue.children)
          : [currValue]),
      ],
      [],
    );
  }

  mapConfig(config: NavItemConfig): NavItemConfig {
    const children =
      config.children && config.children.map(item => this.mapConfig(item));
    const key = config.href;
    return {
      ...config,
      key,
      children,
      label: config.label,
      group: config.name,
    };
  }
}

// TODO: using label filter namespaced menu, refactor later
function isNamespaced({ group }: NavItemConfig): boolean {
  return ['nav_applications', 'nav_config', 'nav_storage'].includes(group);
}

// TODO: condition not solid
function getUrlKey(url: string) {
  const key = url.slice(url.indexOf('/', baseUrl.length + 1) + 1);

  if (!key.startsWith('clusters/')) {
    return key;
  }

  return url.slice(
    url.indexOf('/', url.indexOf('/namespaces/') + '/namespaces/'.length) + 1,
  );
}
