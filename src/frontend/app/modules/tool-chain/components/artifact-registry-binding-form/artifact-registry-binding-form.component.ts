import { ObservableInput, TranslateService } from '@alauda/common-snippet';

import { NotificationService } from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  ArtifactRegistryBinding,
  Secret,
  SecretApiService,
  SecretType,
  groupByScope,
} from '@app/api';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { Observable, Subject, combineLatest } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';

@Component({
  selector: 'alo-artifact-registry-binding-form',
  templateUrl: './artifact-registry-binding-form.component.html',
  styleUrls: ['./artifact-registry-binding-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'artifact-registry-binding-form',
})
export class ArtifactRegistryBindingFormComponent implements OnChanges {
  @ViewChild('form', { static: false })
  form: NgForm;

  @ObservableInput(true)
  private readonly project$: Observable<string>;

  @Input()
  project: string;

  @Input()
  service: string;

  @Input()
  binding: ArtifactRegistryBinding;

  @Output()
  saved = new EventEmitter<Dictionary<string>>();

  @Output()
  statusChange = new EventEmitter<string>();

  nameRule = TOOLCHAIN_BINDING_NAME;

  loading = false;

  tooltype: string;

  get mode() {
    return this.binding ? 'update' : 'create';
  }

  secretsUpdated$$ = new Subject<void>();
  secretType = SecretType;
  secrets$ = combineLatest([
    this.project$,
    this.secretsUpdated$$.pipe(startWith(null)),
  ]).pipe(
    switchMap(([namespace]) => this.secretApi.find(null, namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  formData = {
    name: '',
    secretName: '',
    secretNamespace: '',
    description: '',
    secretType: SecretType.BasicAuth,
  };

  constructor(
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  addSecret() {
    this.secretActions
      .createForToolChain(
        ToolKind.ArtifactRegistry,
        this.tooltype,
        SecretType.BasicAuth,
      )
      .subscribe(result => {
        if (result) {
          this.formData.secretName = result.name;
          this.formData.secretNamespace = result.namespace;
          this.formData.secretType = result.type;
          this.secretsUpdated$$.next();
        }
      });
  }

  ngOnChanges({ binding, service }: SimpleChanges) {
    if (binding && binding.currentValue) {
      this.formData = {
        name: binding.currentValue.name,
        secretName: binding.currentValue.secretName,
        secretNamespace: binding.currentValue.secretNamespace,
        description: binding.currentValue.description,
        secretType: binding.currentValue.secretType,
      };
    }

    if (service && service.currentValue) {
      this.artifactRegistryApi
        .getServiceDetail(ToolKind.ArtifactRegistry, service.currentValue)
        .subscribe(toolService => {
          this.tooltype = toolService.type;
          this.formData = {
            ...this.formData,
            name: `${this.service}-${this.project}`,
            secretType: toolService.secretType || SecretType.BasicAuth,
            secretName: toolService.secretName || '',
            secretNamespace: toolService.secretNamespace || '',
          };
          this.cdr.markForCheck();
        });
    }
  }

  secretToValue(secret: Secret) {
    this.formData.secretName = secret.name;
    this.formData.secretNamespace = secret.namespace;
  }

  submit() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    this.statusChange.emit('loading');
    const params = {
      ...this.formData,
      artifactRegistryName: this.service || this.binding.artifactRegistryName,
      namespace: this.project || this.binding.namespace,
    };
    const request =
      this.mode === 'create'
        ? this.artifactRegistryApi.createBinding.bind(this.artifactRegistryApi)
        : this.artifactRegistryApi.updateBinding.bind(this.artifactRegistryApi);

    request(params).subscribe(
      () => {
        this.saved.emit(params);
        this.statusChange.emit('successed');
      },
      (error: HttpErrorResponse) => {
        this.notification.error({
          title:
            this.mode === 'create'
              ? this.translate.get('project.bind_account_failed')
              : this.translate.get('update.failed'),
          content: error.error.error || error.error.message,
        });
        this.loading = false;
        this.statusChange.emit('error');
      },
    );
  }
}
