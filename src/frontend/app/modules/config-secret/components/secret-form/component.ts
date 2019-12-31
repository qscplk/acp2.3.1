import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseKubernetesResourceFormComponent } from '@app/abstract';
import { ConfigSecretTypeMeta, SecretType } from '@app/api';
import { Secret } from '@app/types';
import { CONFIG_SECRETS_NAME_RULE } from '@app/utils/patterns';
import { head } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'alo-configsecret-form',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretFormComponent
  extends BaseKubernetesResourceFormComponent<Secret>
  implements OnInit, OnDestroy, OnChanges {
  @Input()
  namespace: string;

  @Input()
  types: SecretType[] = [
    SecretType.BasicAuth,
    SecretType.Opaque,
    SecretType.OAuth2,
    SecretType.SSH,
    SecretType.DockerConfig,
    SecretType.TLS,
  ];

  secretTypes = SecretType;
  kind = 'Secret';
  type = 'Opaque';
  typeSub: Subscription;
  nameRule = CONFIG_SECRETS_NAME_RULE;

  getDefaultFormModel() {
    return ConfigSecretTypeMeta;
  }

  createForm() {
    const metadataForm = this.fb.group({
      name: this.fb.control('', [
        Validators.required,
        Validators.maxLength(this.nameRule.maxLength),
        Validators.pattern(this.nameRule.pattern),
      ]),
      namespace: this.fb.control(this.namespace, [Validators.required]),
      labels: this.fb.control({}),
      annotations: this.fb.control({}),
    });
    return this.fb.group({
      metadata: metadataForm,
      data: this.fb.control({}),
      type: this.fb.control('Opaque'),
    });
  }

  adaptResourceModel(resource: Secret) {
    if (!resource || !resource.data) {
      return super.adaptResourceModel(resource);
    }
    const decodedData = Object.entries(resource.data).reduce(
      (accum, [key, value]) => ({ ...accum, [key]: atob(value) }),
      {},
    );
    return { ...resource, data: decodedData };
  }

  adaptFormModel(form: Secret) {
    form = super.adaptResourceModel(form);
    if (!form || !form.data) {
      return form;
    }
    const decodedData = Object.entries(form.data).reduce(
      (accum, [key, value]) => ({ ...accum, [key]: btoa(value) }),
      {},
    );
    return { ...form, data: decodedData };
  }

  ngOnChanges({ types }: SimpleChanges): void {
    if (types && types.currentValue) {
      this.type = head(types.currentValue);
    }
  }

  ngOnInit() {
    super.ngOnInit();
    this.typeSub = this.form
      .get('type')
      .valueChanges.pipe(filter(value => !!value))
      .subscribe(value => {
        if (value === this.type) {
          return;
        }
        this.type = value;
      });
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.typeSub.unsubscribe();
  }

  constructor(injector: Injector) {
    super(injector);
  }

  typeChange() {
    this.form.get('data').setValue({});
  }
}
