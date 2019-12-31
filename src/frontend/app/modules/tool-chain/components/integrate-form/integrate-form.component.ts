import { TranslateService } from '@alauda/common-snippet';
import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChange,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  Secret,
  SecretApiService,
  SecretType,
  Tool,
  ToolChainApiService,
  ToolIntegrateParams,
  ToolService,
} from '@app/api';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';
import { Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

const defaultModel = () => ({
  name: '',
  host: '',
  accessUrl: '',
  secretName: '',
  secretNamespace: '',
  secretType: SecretType.BasicAuth,
});

@Component({
  selector: 'alo-integrate-form',
  templateUrl: './integrate-form.component.html',
  styleUrls: ['./integrate-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'alo-integrate-form',
})
export class IntegrateFormComponent implements OnChanges {
  // Set when create
  @Input()
  tool: Tool;

  // Set when pdate
  @Input()
  toolService: ToolService;

  @Output()
  saved = new EventEmitter<ToolIntegrateParams>();

  @Output()
  statusChange = new EventEmitter<string>();

  @ViewChild('form', { static: false })
  formRef: NgForm;

  supportSecretTypes: SecretType[] = [];

  SecretType = SecretType;

  loading = false;

  nameRule = TOOLCHAIN_BINDING_NAME;

  urlPattern = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;

  model = defaultModel();

  get mode() {
    return this.tool ? 'create' : 'update';
  }

  get isPublic() {
    return (this.tool || this.toolService).public;
  }

  get kind() {
    return (this.tool || this.toolService).kind;
  }

  get type() {
    return (this.tool || this.toolService).type;
  }

  secretTypeChange$$ = new Subject<SecretType>();

  secrets$ = this.secretTypeChange$$.pipe(startWith(null)).pipe(
    switchMap(() => this.secretApi.find({})),
    map(res =>
      res.items.filter(
        item => item.type === this.model.secretType && !item.private,
      ),
    ),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly toolChainApi: ToolChainApiService,
    private readonly translate: TranslateService,
    private readonly notification: NotificationService,
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
  ) {}

  ngOnChanges(changes: {
    tool: SimpleChange;
    toolService: SimpleChange;
  }): void {
    // Create
    if (changes.tool && changes.tool.currentValue) {
      this.model.name = this.tool.name.toLowerCase();
      this.model.host = '';
      this.model.accessUrl = '';
      if (this.isPublic) {
        this.model.host = this.tool.host;
        this.model.accessUrl = this.tool.html;
      }
    }

    // Update
    if (changes.toolService && changes.toolService.currentValue) {
      const service = changes.toolService.currentValue as ToolService;
      this.model = Object.assign(this.model, {
        name: service.name.toLowerCase(),
        host: service.host,
        accessUrl: service.accessUrl,
        secretName: service.secretName,
        secretNamespace: service.secretNamespace,
      });

      this.toolChainApi
        .getSupportedSecretTypes(service.type)
        .subscribe(types => {
          this.supportSecretTypes = types.map(
            supported => (supported.secretType || supported.type) as SecretType,
          );
        });
    }
  }

  submit() {
    this.formRef.onSubmit(null);
    if (this.formRef.invalid) {
      return;
    }
    this.statusChange.emit('saving');
    const integrate =
      this.mode === 'create'
        ? this.toolChainApi.integrateTool.bind(this.toolChainApi)
        : this.toolChainApi.updateTool.bind(this.toolChainApi);
    const params = {
      type: this.type,
      public: this.isPublic,
      ...this.model,
    };
    integrate(this.kind, params).subscribe(
      () => {
        this.statusChange.emit('successful');
        this.cdr.markForCheck();
        this.saved.emit(params);
      },
      (error: any) => {
        this.statusChange.emit('failed');
        this.cdr.markForCheck();
        this.notification.error({
          title: this.translate.get(
            this.mode === 'create'
              ? 'tool_chain.integrate_failed'
              : 'update_failed',
          ),
          content: error.error.error || error.error.message,
        });
      },
    );
  }

  supportAuthType(authType: SecretType) {
    return this.tool
      ? (this.tool.supportedSecretTypes || [])
          .map(supported => supported.secretType || supported.type)
          .includes(authType)
      : this.supportSecretTypes.includes(authType);
  }

  resetSecret(secret?: Secret) {
    if (secret) {
      this.model = {
        ...this.model,
        secretType: secret.type,
        ...this.parseSecret(secret),
      };
    }
    this.secretTypeChange$$.next();
  }

  secretToValue(secret: Secret) {
    this.model = {
      ...this.model,
      ...this.parseSecret(secret),
    };
  }

  addSecret() {
    this.secretActions
      .createForToolChain(
        ToolKind.ArtifactRegistryManager,
        'nexus',
        SecretType.BasicAuth,
      )
      .subscribe(result => {
        if (result) {
          this.resetSecret(result);
        }
      });
  }

  private parseSecret(secret: Secret) {
    return {
      secretName: secret.name,
      secretNamespace: secret.namespace,
    };
  }
}
