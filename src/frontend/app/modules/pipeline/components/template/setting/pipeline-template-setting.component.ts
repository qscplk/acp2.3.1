import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  CodeApiService,
  PipelineApiService,
  PipelineTemplateSync,
  PipelineTemplateSyncConfig,
  Secret,
  SecretApiService,
  SecretType,
  groupByScope,
} from '@app/api';
import { SecretCreateDialogComponent } from '@app/modules/secret';
import { filterBy, getQuery } from '@app/utils/query-builder';
import { get } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './pipeline-template-setting.component.html',
  styleUrls: [
    './pipeline-template-setting.component.scss',
    '../../../../tool-chain/shared-style/repository-option.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateSettingComponent {
  model: any;
  sourceType = 'select';
  namespace: string;
  branches: Array<{ name: string }> = [];
  branchesLoading = false;

  secrets$$ = new BehaviorSubject(null);
  codes$$ = new BehaviorSubject(null);
  secrets$ = this.secrets$$.pipe(
    switchMap(() =>
      this.secretApi.find(
        getQuery(filterBy('secretType', `${SecretType.BasicAuth}`)),
        this.namespace,
        true,
      ),
    ),
    map(res => groupByScope(res.items || [])),
    publishReplay(1),
    refCount(),
  );

  codes$ = this.codes$$.pipe(
    switchMap(() => this.codeApi.findCodeRepositories(this.namespace)),
    map(res => res.items),
    publishReplay(1),
    refCount(),
  );

  setting: PipelineTemplateSync;
  constructor(
    @Inject(DIALOG_DATA)
    public data: { setting: PipelineTemplateSync; namespace: string },
    private readonly dialogRef: DialogRef<PipelineTemplateSettingComponent>,
    private readonly pipelineApi: PipelineApiService,
    private readonly secretApi: SecretApiService,
    private readonly dialog: DialogService,
    private readonly codeApi: CodeApiService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
  ) {
    ({ namespace: this.namespace, setting: this.setting } = data);

    const secret =
      data.setting && data.setting.secret
        ? `${get(data, 'setting.secret.namespace') || ''}/${get(
            data,
            'setting.secret.name',
          ) || ''}`
        : null;

    this.model = {
      codeRepository: get(this.setting, 'codeRepositoryName'),
      repo: get(this.setting, 'gitUri'),
      branch: get(this.setting, 'branch'),
      selectBranch: get(this.setting, 'selectBranch'),
      secret,
    };
    if (this.model.codeRepository) {
      this.model.repo = '';
      this.model.branch = '';
      this.model.secret = '';
    }
    if (this.model.repo) {
      this.sourceType = 'input';
    }
  }

  addSecret() {
    const ref = this.dialog.open(SecretCreateDialogComponent, {
      size: DialogSize.Large,
      data: {
        namespace: this.namespace,
        types: [SecretType.BasicAuth],
        env: 'admin',
      },
    });
    ref.afterClosed().subscribe((secret: any) => {
      if (secret) {
        this.secrets$$.next(null);
        this.secrets$
          .subscribe(() => {
            this.model.secret = this.secretToValue(secret);
          })
          .unsubscribe();
      }
    });
  }

  getBranches(repository: string) {
    this.model.selectBranch = '';
    this.branches = [];
    this.branchesLoading = true;
    this.pipelineApi
      .getPipeineCodeRepositoryBranchs(repository, this.namespace)
      .subscribe(
        (res: any) => {
          const branches = get(res, 'branches', []);
          this.branches = branches.map(
            (branch: { commit?: string; name: string }) => ({
              name: branch.name,
            }),
          );
          this.branchesLoading = false;
        },
        () => {
          this.branches = [];
          this.branchesLoading = false;
        },
      );
  }

  onSubmit(value: any) {
    const data = this.getData(value);
    if (!this.setting) {
      this.pipelineApi.templateSetting(this.namespace, data).subscribe(
        (result: PipelineTemplateSync) => {
          this.dialogRef.close(result);
          this.message.success({
            content: this.translate.get('pipeline.template_sync_setting_succ'),
          });
        },
        (err: any) => {
          this.notification.error({
            title: this.translate.get('pipeline.template_sync_setting_fail'),
            content: err.error.error || err.error.message,
          });
        },
      );
    } else {
      this.pipelineApi
        .updateTemplateSetting(this.namespace, this.setting.name, data)
        .subscribe(
          (result: PipelineTemplateSync) => {
            this.dialogRef.close(result);
            this.message.success({
              content: this.translate.get(
                'pipeline.template_sync_setting_update_succ',
              ),
            });
          },
          (err: any) => {
            this.notification.error({
              title: this.translate.get(
                'pipeline.template_sync_setting_update_fail',
              ),
              content: err.error.error || err.error.message,
            });
          },
        );
    }
  }

  hideDialog() {
    this.dialog.closeAll();
  }

  private getData(value: any) {
    let data: PipelineTemplateSyncConfig;
    if (this.sourceType === 'select') {
      data = {
        codeRepository: {
          name: value.codeRepository,
          ref: value.selectBranch,
        },
      };
    } else {
      data = {
        git: {
          uri: value.repo,
          ref: value.branch,
        },
      };
      if (value.secret) {
        data.secret = toSecretIdentity(value.secret);
      }
    }
    return data;
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }
}

function toSecretIdentity(value: string) {
  const [namespace, name] = (value || '').split('/');

  return {
    name,
    namespace,
  };
}
