import { TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
} from '@angular/core';
import {
  ApplicationApiService,
  ApplicationIdentity,
  ComponentModel,
  Container,
  K8sResourceDetail,
} from '@app/api';

@Component({
  selector: 'alo-k8s-resource-update',
  templateUrl: 'k8s-resource-update.component.html',
  styleUrls: [
    'k8s-resource-update.component.scss',
    '../../shared-style/mutate-page-bottom-buttons.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class K8sResourceUpdateComponent implements OnChanges {
  @Input()
  params: ApplicationIdentity;

  @Input()
  data: any;

  model: ComponentModel;
  result: K8sResourceDetail;
  oldSecrets: string[];
  updating = false;

  constructor(
    private readonly location: Location,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly notifaction: NotificationService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges() {
    if (this.data) {
      this.initParams();
    }
  }

  update() {
    this.updating = true;
    this.api
      .putDeployment(
        this.params.cluster,
        this.params.namespace,
        this.model.componentName,
        this.model,
      )
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('application.resource_update_success', {
              type: 'Deployment',
              name: this.model.componentName,
            }),
          });
          this.location.back();
        },
        (error: any) => {
          this.notifaction.error({
            title: this.translate.get('update_failed'),
            content: error.error.error || error.error.message,
          });
          this.updating = false;
          this.cdr.detectChanges();
        },
      );
  }

  cancel() {
    this.location.back();
  }

  initParams() {
    const result: K8sResourceDetail = this.data.data;
    this.oldSecrets = (result.imagePullSecrets || []).map(
      secret => secret.name,
    );
    const containers: Container[] = result.containers.map(
      (container, index: number) => {
        return {
          name: container.name,
          image: container.image,
          command: container.command,
          args: container.args,
          resources: container.resources,
          volumeMounts: result.volumeInfos[index] || [],
          secret: '',
          env: container.env,
          envFrom: container.envFrom,
          isEdit: true,
        };
      },
    );
    this.model = {
      componentName: result.objectMeta.name,
      replicas: result.podInfo.desired,
      type: 'Deployment',
      labels: result.objectMeta.labels,
      secrets: (result.imagePullSecrets || []).map(secret => secret.name),
      clusterAccess: result.networkInfo.internalNetworkInfos,
      publicNetworkAccess: result.networkInfo.externalNetworkInfos,
      publicIPAccess: result.networkInfo.externalNodePortInfos,
      containers: containers,
    };
  }
}
