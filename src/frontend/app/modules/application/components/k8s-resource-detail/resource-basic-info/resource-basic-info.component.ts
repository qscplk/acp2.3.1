import { TranslateService } from '@alauda/common-snippet';
import { ConfirmType, DialogService, MessageService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  ApplicationIdentity,
  K8sResourceDetail,
  ApplicationApiService,
} from '@app/api';

import { isEmpty } from 'lodash-es';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'alo-k8s-resource-basic-info',
  templateUrl: './resource-basic-info.component.html',
  styleUrls: ['./resource-basic-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class K8sResourceBasicInfoComponent {
  @Input()
  result: K8sResourceDetail;

  @Input()
  data: ApplicationIdentity;

  @Input()
  isContainersRequestsEmpty: { cpu: boolean; memory: boolean };

  @Input()
  allowedUpdate: boolean;

  @Output()
  updateLabelsEvent = new EventEmitter();

  @Output()
  updateAnnotationsEvent = new EventEmitter();

  @Output()
  updatedReplicasEvent = new EventEmitter<void>();

  @Output()
  updatedHpaEvent = new EventEmitter<void>();

  @Output()
  deletedHpaEvent = new EventEmitter<void>();

  scaling = false;

  constructor(
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly message: MessageService,
    private readonly api: ApplicationApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get errorMessages() {
    const message: string[] = [];
    (this.result.podInfo.pods || []).forEach(pod => {
      pod.warnings.forEach(warning => {
        message.push(warning.message);
      });
    });
    return message;
  }

  get isAutoScaling() {
    return !isEmpty(this.result.horizontalPodAutoscalerList);
  }

  get autoScalingSetting() {
    return this.result.horizontalPodAutoscalerList[0];
  }

  updateLabels() {
    this.updateLabelsEvent.next();
  }

  updateAnnotations() {
    this.updateAnnotationsEvent.next();
  }

  onDesiredChange(replicas: number) {
    if (replicas < 0) {
      return;
    }

    if (replicas === 0) {
      this.dialog
        .confirm({
          title: this.translate.get('scale_down_confirm', {
            name: this.data.resourceName,
          }),
          cancelText: this.translate.get('cancel'),
          confirmText: this.translate.get('scale_down'),
          confirmType: ConfirmType.Danger,
          content: this.translate.get('scale_down_confirm_description'),
        })
        .then(() => {
          this.scale(replicas, this.data.kind);
        })
        .catch(() => {});
    } else {
      this.scale(replicas, this.data.kind);
    }
  }

  scale(replicas: number, kind: string) {
    this.scaling = true;
    this.cdr.detectChanges();
    this.api
      .scaleK8sResource(
        this.data.resourceName,
        this.data.namespace,
        kind,
        replicas,
        this.data.cluster,
      )
      .pipe(delay(1000))
      .subscribe(
        () => {
          this.scaling = false;
          this.updatedReplicasEvent.emit();
          this.cdr.detectChanges();
        },
        () => {
          this.message.error({
            content: this.translate.get('scale_fail'),
          });
          this.scaling = false;
          this.cdr.detectChanges();
        },
      );
  }

  isEmptyNetwork(type: string) {
    switch (type) {
      case 'external':
        return isEmpty(this.result.visitAddresses.external);
      case 'internal':
        return isEmpty(this.result.visitAddresses.internal);
    }
  }

  hpaUpdated() {
    this.updatedHpaEvent.emit();
  }

  hpaDeleted() {
    this.deletedHpaEvent.emit();
  }
}
