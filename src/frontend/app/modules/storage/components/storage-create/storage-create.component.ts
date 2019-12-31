import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseResourceMutatePageComponent } from '@app/abstract';
import { StorageApiService } from '@app/api';

@Component({
  selector: 'alo-storage-create',
  templateUrl: './storage-create.component.html',
  styleUrls: ['storage-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageCreateComponent extends BaseResourceMutatePageComponent<
  any
> {
  @Input()
  displayModel = 'form';

  @Output()
  created = new EventEmitter<string>();

  cluster = this.route.snapshot.params.cluster;
  namespace = this.route.snapshot.params.namespace;
  displayName = '';
  get kind() {
    return 'PersistentVolumeClaim';
  }

  constructor(
    injector: Injector,
    private readonly storageApi: StorageApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly route: ActivatedRoute,
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

    this.storageApi
      .createStorage(
        this.cluster,
        this.namespace,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        res => {
          this.message.success({
            content: this.translate.get('storage.storage_create_succ'),
          });
          this.created.emit(res.objectMeta.name);
        },
        (err: any) => {
          this.notifaction.error({
            title: this.translate.get('storage.storage_create_fail'),
            content: err.error.error || err.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
