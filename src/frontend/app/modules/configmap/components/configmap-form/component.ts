import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseKubernetesResourceFormComponent } from '@app/abstract';
import { ConfigMapTypeMeta } from '@app/api';
import { ConfigMap } from '@app/types';
import { CONFIGMAP_NAME_RULE } from '@app/utils/patterns';

@Component({
  selector: 'alo-configmap-form',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigMapFormComponent
  extends BaseKubernetesResourceFormComponent<ConfigMap>
  implements OnInit {
  @Input()
  namespace: string;
  @Input()
  cluster: string;
  kind = 'ConfigMap';
  nameRule = CONFIGMAP_NAME_RULE;

  getDefaultFormModel() {
    return ConfigMapTypeMeta;
  }

  createForm() {
    const metadataForm = this.fb.group({
      name: this.fb.control('', [
        Validators.required,
        Validators.pattern(this.nameRule.pattern),
        Validators.maxLength(this.nameRule.maxLength),
      ]),
      namespace: this.fb.control(this.namespace, [Validators.required]),
      labels: this.fb.control({}),
      annotations: this.fb.control({}),
    });
    return this.fb.group({
      metadata: metadataForm,
      data: this.fb.control({}),
    });
  }

  ngOnInit() {
    super.ngOnInit();
  }

  constructor(injector: Injector) {
    super(injector);
  }
}
