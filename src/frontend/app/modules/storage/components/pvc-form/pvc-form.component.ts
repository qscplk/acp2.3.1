import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseKubernetesResourceFormComponent } from '@app/abstract';
import { PersistentVolumeClaimTypeMeta, StorageApiService } from '@app/api';
import { PersistentVolumeClaim } from '@app/types';
import { STORAGES_NAME_RULE } from '@app/utils/patterns';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-pvc-form',
  templateUrl: './pvc-form.component.html',
  styleUrls: ['./pvc-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersistentVolumeClaimFormComponent
  extends BaseKubernetesResourceFormComponent<PersistentVolumeClaim>
  implements OnInit {
  @Input()
  cluster: string;
  @Input()
  namespace: string;
  kind = 'PersistentVolumeClaim';
  accessModes = ['ReadWriteOnce', 'ReadOnlyMany', 'ReadWriteMany'];
  nameRule = STORAGES_NAME_RULE;
  storageClassNames: string[];

  getDefaultFormModel() {
    return {
      ...PersistentVolumeClaimTypeMeta,
      accessModes: ['ReadWriteOnce'],
      resources: { requests: { storage: '8Gi' } },
      selector: { matchLabels: {} },
    };
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
    const specForm = this.fb.group({
      accessModes: this.fb.control([]),
      storageClassName: this.fb.control(''),
      resources: this.fb.control({}),
      selector: this.fb.control({}),
    });
    return this.fb.group({
      metadata: metadataForm,
      spec: specForm,
    });
  }

  async ngOnInit() {
    super.ngOnInit();
    this.storageClassNames = await this.storageApi
      .getStorageclasses(this.cluster)
      .pipe(
        map(({ storageClasses }) =>
          storageClasses.map((item: any) => item.objectMeta.name),
        ),
      )
      .toPromise();
    if (!this.updateMode) {
      this.form
        .get('spec.storageClassName')
        .setValue(this.storageClassNames[0] || '');
      this.cdr.markForCheck();
    }
  }

  adaptFormModel(form: { [key: string]: any }) {
    const spec = { ...form.spec };
    if (spec.selector) {
      spec.selector = { matchLabels: spec.selector };
    }
    spec.accessModes = [spec.accessModes];
    spec.resources = { requests: { storage: spec.resources } };
    return { ...form, spec };
  }

  adaptResourceModel(resource: any) {
    if (!resource || !resource.spec) {
      return super.adaptResourceModel(resource);
    }
    resource = { ...resource };
    const spec = resource.spec;
    if (spec.selector && spec.selector.matchLabels) {
      const labels = spec.selector.matchLabels;
      delete resource.spec.selector.matchLabels;
      Object.keys(labels).forEach(key => {
        spec.selector[key] = labels[key];
      });
    }
    spec.accessModes = spec.accessModes[0];
    spec.resources = spec.resources.requests.storage;
    return { ...resource, spec };
  }

  constructor(injector: Injector, private storageApi: StorageApiService) {
    super(injector);
  }
}
