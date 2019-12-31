import {
  AuthorizationStateService,
  CommonLayoutStoreService,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
} from '@alauda/common-snippet';
import {
  // ConfirmType,
  ConfirmType,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Environments } from '@app/app-global';
import { RESOURCE_TYPES } from '@app/constants';
import { ENVIRONMENTS, RoleService } from '@app/services';
import { safeLoadAll } from 'js-yaml';
import { get, head } from 'lodash-es';
import { Observable } from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  startWith,
} from 'rxjs/operators';

const NEED_PERMISSION_MENUS = ['platformview', 'projectview', 'clusterview'];

@Component({
  selector: 'alo-global-actions',
  templateUrl: 'global-actions.component.html',
  styleUrls: ['global-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('viewState', [
      state(
        'admin',
        style({
          left: '16px',
        }),
      ),
      state(
        'user',
        style({
          left: '0px',
        }),
      ),
      transition(':enter', animate(200)),
    ]),
  ],
})
export class GlobalActionsComponent {
  clusterEnv = 'SYNC_TKE';

  get currentLanguage() {
    return this.translate.locale;
  }

  get isAdminView() {
    if (!this.route.snapshot.parent) {
      return false;
    }

    const urlSegment = head(this.route.snapshot.parent.url) || { path: '' };

    return urlSegment.path === 'admin';
  }

  get currentView() {
    return this.isAdminView ? 'admin' : 'user';
  }

  get helpUrl() {
    return `${window.location.protocol}//${window.location.host}/devops-docs`;
  }

  editorOptions = { language: 'yaml' };
  editorConfig = {
    recover: false,
    diffMode: false,
  };

  yaml = '';
  originalYaml = '';

  user$ = this.auth
    .getTokenPayload<{
      email?: string;
      name: string;
      ext: { is_admin: boolean };
    }>()
    .pipe(
      filter(payload => !!payload),
      map(payload => ({
        email: payload.email || '',
        name: payload.name,
        isAdmin: get(payload, 'ext.is_admin'),
      })),
      startWith({ name: '', isAdmin: false }),
      publishReplay(1),
      refCount(),
    );

  permissions$: Observable<Dictionary<boolean>> = this.k8sPermission
    .isAllowed({
      type: RESOURCE_TYPES.VIEWS,
      name: NEED_PERMISSION_MENUS,
      action: K8sResourceAction.GET,
    })
    .pipe(
      map(status =>
        NEED_PERMISSION_MENUS.reduce(
          (accum, menu, index) => ({
            ...accum,
            [menu]: status[index],
          }),
          {} as Dictionary<boolean>,
        ),
      ),
      startWith({
        platformview: false,
        projectview: false,
        clusterview: false,
      }),
    );

  @ViewChild('yamlCreateDialog', { static: false })
  private readonly yamlCreateDialog: TemplateRef<any>;

  constructor(
    private readonly translate: TranslateService,
    private readonly dialogService: DialogService,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    public auth: AuthorizationStateService,
    public role: RoleService,
    private readonly router: Router,
    private readonly layoutStore: CommonLayoutStoreService,
    private readonly k8sPermission: K8sPermissionService,
    @Inject(ENVIRONMENTS) public envs: Environments,
  ) {}

  toggleLanguage() {
    this.translate.toggleLocale();
  }

  switchView() {
    this.router.navigateByUrl(this.isAdminView ? '/home/projects' : '/admin');
  }

  openYamlCreateDialog() {
    this.dialogService.open(this.yamlCreateDialog, {
      size: DialogSize.Big,
    });
  }

  createResource() {
    let resources;
    try {
      resources = safeLoadAll(this.yaml);
    } catch (error) {
      this.notifaction.error({
        title: this.translate.get('yaml_invalid'),
      });
    }
    this.http.post('{{API_GATEWAY}}/devops/api/v1/others', resources).subscribe(
      (res: any) => {
        this.message.success({
          content: this.translate.get('create_resource_succ', {
            succ: res.success_resource_count,
            fail: res.failed_resource_count,
          }),
        });
      },
      (error: any) => {
        this.notifaction.error({
          title: this.translate.get('create_resource_fail'),
          content: error.error.error || error.error.message,
        });
      },
    );
  }

  navigateToPlatform(entry: '/manage' | '/home' | '/home/personal-info') {
    this.layoutStore
      .selectProductByName('console-platform')
      .subscribe((product: any) => {
        if (product) {
          window.open(`${product.url}#${entry}`, '_blank');
        }
      });
  }

  navigateToClusterManagement() {
    window.open('/console-cluster', '_blank');
  }

  logout() {
    this.dialogService
      .confirm({
        title: this.translate.get('logout_confirm'),
        confirmText: this.translate.get('logout'),
        cancelText: this.translate.get('cancel'),
        confirmType: ConfirmType.Primary,
      })
      .then(() => this.auth.logout())
      .catch(() => {});
  }

  checkEnv(envs: Environments, key: keyof Environments) {
    if (!envs) {
      return false;
    }
    return get(envs, key, '').toLowerCase() === 'true';
  }
}
