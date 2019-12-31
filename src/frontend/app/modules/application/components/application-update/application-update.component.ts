import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { Application, ApplicationIdentity } from '@app/api';

@Component({
  selector: 'alo-application-update',
  templateUrl: './application-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationUpdateComponent implements OnChanges {
  @Input()
  params: ApplicationIdentity;
  @Input()
  data: Application;
  @Output()
  canceled = new EventEmitter<void>();
  @Output()
  saved = new EventEmitter<string>();
  deployments: any;

  ngOnChanges() {
    if (this.data && this.data.deployments) {
      this.deployments = this.data.deployments.map(deployment => {
        return {
          ...(deployment.injectSidecar !== undefined
            ? {
                injectSidecar:
                  deployment.injectSidecar === 'true' ? true : false,
              }
            : {}),
          componentName: deployment.name,
          replicas: deployment.podInfo.desired,
          type: deployment.kind,
          labels: deployment.labels,
          annotations: deployment.annotations,
          secrets: deployment.secrets,
          containers: deployment.containers.map((container, index) => {
            return {
              ...container,
              volumeMounts: deployment.volumeInfos[index] || [],
              secret: '',
              isEdit: true,
            };
          }),
          clusterAccess: deployment.clusterAccess,
          publicNetworkAccess: deployment.publicNetworkAccess,
          publicIPAccess: deployment.publicIPAccess,
          volumeInfos: deployment.volumeInfos,
        };
      });
    }
  }

  onCanceled() {
    this.canceled.emit();
  }

  onUpdated(name: string) {
    this.saved.emit(name);
  }
}
