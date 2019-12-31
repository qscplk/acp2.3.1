import {
  TranslateService,
  FeatureGateService,
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
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  getRouteConfigPathFromRoot,
  routerTransition,
} from '@app/router-transition';
import {
  NavControlService,
  TemplateHolderType,
  UiStateService,
} from '@app/services';
import { Subject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  publishReplay,
  refCount,
  startWith,
  takeUntil,
} from 'rxjs/operators';

@Component({
  templateUrl: 'admin.component.html',
  styleUrls: ['admin.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routerTransition],
})
export class AdminComponent implements OnInit, OnDestroy {
  defaultConfigs = this.navControl.getAdminViewNavConfigs();
  onDestroy$ = new Subject<void>();

  pageHeaderContentTemplate$ = this.uiState.getTemplateHolder(
    TemplateHolderType.PageHeaderContent,
  ).templatePortal$;

  get language() {
    return this.translate.locale;
  }

  showLoadingBar$ = this.uiState.showLoadingBar$;

  configs$ = this.defaultConfigs.pipe(
    map(navConfigs => navConfigs.map(config => this.mapConfig(config))),
    publishReplay(1),
    refCount(),
  );

  activated$ = combineLatest(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.url),
      startWith(this.router.url),
      distinctUntilChanged(),
      map(url => url.slice(url.indexOf('/', 1) + 1)),
    ),
    this.configs$.pipe(map(configs => this.flatConfigs(configs))),
  ).pipe(
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
    private readonly navControl: NavControlService,
    private readonly router: Router,
    public themeService: ThemeService,
    private readonly title: Title,
    private readonly featureGate: FeatureGateService,
  ) {}

  ngOnInit(): void {
    this.activated$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((activated: NavItemConfig) => {
        this.title.setTitle(activated.label);
      });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
  }

  getActivatedKey(activated: NavItemConfig) {
    if (activated) {
      return activated.key;
    }
    return '';
  }

  handleActivatedNavItemChange(item: NavItemConfig) {
    if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
      window.open(item.href, '_blank');
    } else {
      this.router.navigate(['/admin', ...item.href.split('/')]);
    }
  }

  toggleLanguage() {
    this.translate.toggleLocale();
  }

  getPage(outlet: RouterOutlet) {
    return getRouteConfigPathFromRoot(outlet.activatedRoute);
  }

  filterEnabled = (items: NavItemConfig[], cluster: string = null) => {
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

  private flatConfigs(items: NavItemConfig[]): NavItemConfig[] {
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

  private mapConfig(config: NavItemConfig): NavItemConfig {
    const children =
      config.children && config.children.map(item => this.mapConfig(item));
    const key = config.href;
    return {
      ...config,
      children,
      key,
      label: config.label,
    };
  }
}
