import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseResourceMutatePageComponent } from '@app/abstract';
import {
  PersistentVolumeClaimTypeMeta,
  StorageApiService,
  StorageDetail,
} from '@app/api';
import { publishReplay, refCount } from 'rxjs/operators';

@Component({
  selector: 'alo-storage-update',
  templateUrl: './storage-update.component.html',
  styleUrls: ['storage-update.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageUpdateComponent extends BaseResourceMutatePageComponent<any>
  implements OnInit {
  @Input()
  displayModel = 'form';

  cluster = this.route.snapshot.params.cluster;
  namespace = this.route.snapshot.params.namespace;
  name = this.activatedRoute.snapshot.params.name;
  displayName = '';
  originalYaml: string;
  get kind() {
    return 'PersistentVolumeClaim';
  }

  storage$ = this.storageApi
    .getStorage(this.cluster, this.namespace, this.name)
    .pipe(publishReplay(1), refCount());

  constructor(
    injector: Injector,
    private readonly storageApi: StorageApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly route: ActivatedRoute,
  ) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.storage$.subscribe(
      (storage: StorageDetail) => {
        this.displayName = storage.displayName || '';
        this.formModel = {
          apiVersion: PersistentVolumeClaimTypeMeta.apiVersion,
          kind: storage.typeMeta.kind,
          metadata: storage.objectMeta,
          spec: {
            accessModes: storage.accessModes,
            resources: {
              requests: storage.capacity || { storage: '' },
            },
            storageClassName: storage.storageClass,
          },
        };
        this.originalYaml = this.formToYaml(this.formModel);
      },
      (err: any) => {
        this.notifaction.error({
          title: this.translate.get('storage.storage_get_fail'),
          content: err.error.error || err.error.message,
        });
      },
    );
  }

  update() {
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
      .updateStorage(
        this.cluster,
        this.namespace,
        this.name,
        this.formModel,
        this.displayName,
      )
      .subscribe(
        (res: any) => {
          this.message.success({
            content: this.translate.get('storage.storage_update_succ'),
          });
          this.router.navigate(['../detail', res.objectMeta.name], {
            relativeTo: this.activatedRoute,
          });
        },
        (err: any) => {
          this.notifaction.error({
            title: this.translate.get('storage.storage_update_fail'),
            content: err.error.error || err.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
