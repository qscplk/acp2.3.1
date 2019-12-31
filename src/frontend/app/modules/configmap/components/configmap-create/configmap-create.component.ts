import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
} from '@angular/core';
import { BaseResourceMutatePageComponent } from '@app/abstract';
import { ConfigMapApiService } from '@app/api';

@Component({
  selector: 'alo-configmap-create',
  templateUrl: './configmap-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigMapCreateComponent extends BaseResourceMutatePageComponent<
  any
> {
  @Input()
  displayModel = 'form';

  @Output()
  created = new EventEmitter<string>();

  cluster = this.activatedRoute.snapshot.params.cluster;
  namespace = this.activatedRoute.snapshot.params.namespace;
  displayName = '';
  get kind() {
    return 'ConfigMap';
  }

  constructor(
    injector: Injector,
    private readonly configmapApi: ConfigMapApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
  ) {
    super(injector);
  }

  create() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    if (this.mode === 'yaml') {
      this.formModel = this.yamlToForm(this.yaml);
    }

    this.submitting = true;
    this.cdr.markForCheck();

    this.configmapApi
      .createConfigMap(
        this.cluster,
        this.namespace,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        res => {
          this.message.success({
            content: this.translate.get('configmap.configmap_create_succ'),
          });
          this.router.navigate(['../detail', res.objectMeta.name], {
            relativeTo: this.activatedRoute,
          });
        },
        (err: any) => {
          this.notifaction.error({
            title: this.translate.get('configmap.configmap_create_fail'),
            content: err.error.error || err.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
