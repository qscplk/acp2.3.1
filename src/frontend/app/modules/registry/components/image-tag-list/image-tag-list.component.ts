import {
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
} from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { ImageTag } from '@app/api/registry/registry-api.types';
import { RESOURCE_TYPES } from '@app/constants';

@Component({
  selector: 'alo-image-tag-list',
  templateUrl: 'image-tag-list.component.html',
  styleUrls: ['image-tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageTagListComponent {
  @Input()
  tags: ImageTag[] = [];

  @Input()
  type: string;

  @Input()
  namespace: string;

  @Input()
  repository: string;

  @Input()
  imagePath: string;

  @Input()
  scanDisabled = false;

  @Output()
  scanTrigger = new EventEmitter<ImageTag>();

  scanPermission$ = this.permission.isAllowed({
    namespace: this.namespace,
    type: RESOURCE_TYPES.IMAGEREPOSITORIES_SECURITY,
    action: K8sResourceAction.CREATE,
  });

  constructor(
    private readonly registryApi: RegistryApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly permission: K8sPermissionService,
  ) {}

  trackByName(_: number, item: ImageTag) {
    return item.name;
  }

  getRowDef() {
    return this.type === 'Harbor'
      ? ['name', 'vulnerability', 'size', 'digest', 'action']
      : ['name', 'digest'];
  }

  scan(tag: ImageTag) {
    this.registryApi
      .triggerSecurityScan(this.namespace, this.repository, tag.name)
      .subscribe(
        () => {
          this.message.success(this.translate.get('registry.scan_started'));
          this.scanTrigger.emit(tag);
        },
        error => {
          this.notifaction.error({
            title: this.translate.get('registry.scan_start_failed'),
            content: error.error.message || error.error.error,
          });
        },
      );
  }

  getFullTagPath(item: ImageTag) {
    return `${this.imagePath}:${item.name}`;
  }
}
