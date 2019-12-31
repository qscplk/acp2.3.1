import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { NgForm } from '@angular/forms';
import {
  ApplicationIdentity,
  ComponentModel,
  ConfigSecretApiService,
  SecretType,
} from '@app/api';
import { APPLICATION_NAME_RULE } from '@app/utils/patterns';
import { uniq, get } from 'lodash-es';
import { of } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

@Component({
  selector: 'alo-app-resource-form',
  templateUrl: './app-resource-form.component.html',
  styleUrls: ['./app-resource-form.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppResourceFormComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => AppResourceFormComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppResourceFormComponent
  implements ControlValueAccessor, Validator {
  @Input()
  isMulti: boolean;
  @Input()
  params: ApplicationIdentity;
  @Input()
  oldSecrets: string[] = [];
  @Input()
  isEdit = false;
  @ViewChild('form', { static: false })
  form: NgForm;
  @Input()
  meshEnabled: string;

  get nameRule() {
    const maxLength = 62 - get(this.params, 'namespace.length', 0);
    return APPLICATION_NAME_RULE(maxLength);
  }

  secrets$ = of(this.params)
    .pipe(map(() => this.params))
    .pipe(
      switchMap(params =>
        this.secretApi.getSecrets({
          cluster: params.cluster,
          namespace: params.namespace,
        }),
      ),
      map(list => list.items),
      publishReplay(1),
      refCount(),
    );

  secretTypes = SecretType;
  model: ComponentModel;
  propagateChange = (_: any) => {};

  constructor(
    private cdr: ChangeDetectorRef,
    private secretApi: ConfigSecretApiService,
  ) {}

  get displayInjectSidecar() {
    return !this.isEdit
      ? this.meshEnabled !== 'false' && this.meshEnabled === 'enabled'
      : this.meshEnabled === 'enabled';
  }

  writeValue(model: ComponentModel): void {
    this.model = model;
    if (model) {
      if (!this.isEdit) {
        this.model.injectSidecar = this.meshEnabled === 'enabled';
      }
      this.cdr.detectChanges();
    }
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(): void {}

  validate(): ValidationErrors {
    return null;
  }

  envFromChange() {
    this.propagateChange(this.model);
  }

  get canDisplayClusterAccessTable() {
    return (this.model.clusterAccess || []).length > 0;
  }

  get canDisplayPublicNetworkAccessTable() {
    return (this.model.publicNetworkAccess || []).length > 0;
  }

  get canDisplayPublicIPAccessTable() {
    return (this.model.publicIPAccess || []).length > 0;
  }

  reduceReplicas() {
    this.model.replicas =
      this.model.replicas <= 0 ? 0 : this.model.replicas - 1;
  }

  increaseReplicas() {
    this.model.replicas =
      this.model.replicas <= 0 ? 1 : this.model.replicas + 1;
  }

  addClusterAccess() {
    this.model.clusterAccess.push({
      serviceName: '',
      protocol: 'TCP',
    });
  }

  addPublicNetworkAccess() {
    this.model.publicNetworkAccess.push({
      domainPrefix: '',
      domainName: '',
      path: '',
    });
  }

  addPublicIPAccess() {
    this.model.publicIPAccess.push({
      protocol: 'TCP',
    });
  }

  checkFormValid() {
    this.form.onSubmit(null);
    return this.form.valid;
  }

  secretChange(event: { action: string; name: string }) {
    switch (event.action) {
      case 'add':
        this.model.secrets.push(event.name);
        this.model.secrets = uniq(this.model.secrets);
        break;
      case 'delete':
        const index = this.oldSecrets.findIndex(secret => {
          return event.name === secret;
        });
        if (index < 0) {
          this.model.secrets = this.model.secrets.filter(
            secret => secret !== event.name,
          );
        }
        break;
    }
  }
}
