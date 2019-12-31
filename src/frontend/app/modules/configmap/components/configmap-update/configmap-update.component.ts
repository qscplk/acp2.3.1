import { MessageService, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { BaseResourceMutatePageComponent } from '@app/abstract';
import {
  ConfigMapApiService,
  ConfigMapDetail,
  ConfigMapTypeMeta,
} from '@app/api';

@Component({
  selector: 'alo-configmap-update',
  templateUrl: './configmap-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigmapUpdateComponent
  extends BaseResourceMutatePageComponent<any>
  implements OnInit {
  @Input()
  displayModel = 'form';

  cluster = this.activatedRoute.snapshot.params.cluster;
  namespace = this.activatedRoute.snapshot.params.namespace;
  name = this.activatedRoute.snapshot.params.name;
  displayName = '';
  originalYaml: any;
  get kind() {
    return 'ConfigMap';
  }

  constructor(
    injector: Injector,
    private readonly configmapApi: ConfigMapApiService,
    private readonly notifaction: NotificationService,
    private readonly message: MessageService,
    private readonly location: Location,
  ) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.configmapApi
      .getConfigMap(this.cluster, this.namespace, this.name)
      .subscribe(
        (configmap: ConfigMapDetail) => {
          this.displayName = configmap.displayName || '';
          this.formModel = {
            apiVersion: ConfigMapTypeMeta.apiVersion,
            data: configmap.data,
            kind: configmap.typeMeta.kind,
            metadata: configmap.objectMeta,
          };
          this.originalYaml = this.formToYaml(this.formModel);
          this.cdr.markForCheck();
        },
        (err: any) => {
          this.notifaction.warning({
            title: this.translate.get('configmap.configmap_get_fail'),
            content: err.error.error || err.error.message,
          });
        },
      );
  }

  update() {
    this.form.onSubmit(null);
    if (this.mode === 'yaml') {
      this.formModel = this.yamlToForm(this.yaml);
    }

    this.submitting = true;
    this.cdr.markForCheck();

    this.configmapApi
      .updateConfigMap(
        this.cluster,
        this.namespace,
        this.name,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('configmap.configmap_update_succ'),
          });
          this.location.back();
        },
        (err: any) => {
          this.notifaction.error({
            title: this.translate.get('configmap.configmap_update_fail'),
            content: err.error.error || err.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
