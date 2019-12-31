import { TranslateService } from '@alauda/common-snippet';
import { ConfirmType, DialogService, MessageService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  AppK8sResource,
  ApplicationApiService,
  ApplicationIdentity,
  Container,
  ContainerParams,
} from '@app/api';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'alo-k8s-resource-card',
  templateUrl: 'k8s-resource-card.component.html',
  styleUrls: ['k8s-resource-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class K8sResourceComponent implements OnChanges {
  @Input()
  params: ApplicationIdentity;

  @Input()
  data: AppK8sResource;

  @Input()
  allowedUpdate: boolean;

  @Output()
  updated = new EventEmitter<void>();

  @Output()
  showContainerLogs = new EventEmitter<any>();

  containerParams: ContainerParams;

  scaling = false;

  constructor(
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly api: ApplicationApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges() {
    this.containerParams = {
      name: this.data.name,
      kind: this.data.kind,
      namespace: this.data.namespace,
      podInfo: this.data.podInfo,
    };
  }

  get errorMessages() {
    const message: string[] = [];
    (this.data.podInfo.pods || []).forEach(pod => {
      pod.warnings.forEach(warning => {
        message.push(warning.message);
      });
    });
    return message;
  }

  containerIdentity(_: number, item: Container) {
    return item.name;
  }

  onDesiredChange(replicas: number) {
    if (replicas < 0) {
      return;
    }

    if (replicas === 0) {
      this.dialog
        .confirm({
          title: this.translate.get('scale_down_confirm', {
            name: this.data.name,
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
        this.data.name,
        this.data.namespace,
        kind,
        replicas,
        this.params.cluster,
      )
      .pipe(delay(1000))
      .subscribe(
        () => {
          this.scaling = false;
          this.updated.emit();
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

  containerSelectedLogs(event: {
    resourceName?: string;
    containerName?: string;
    kind?: string;
  }) {
    this.showContainerLogs.next(event);
  }
}
