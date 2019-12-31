import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { ApplicationApiService, ClusterAccess } from '@app/api';

import { NetworkInfo } from './resource-network.component';

enum ActionType {
  Create = 'create',
  Update = 'update',
}

@Component({
  templateUrl: './internal-network-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternalNetworkDialogComponent implements OnInit {
  clusterAccess: ClusterAccess[] = [];
  oldInternalNetworkInfo: NetworkInfo;
  actionType: ActionType;
  name: string;
  cluster: string;
  namespace: string;
  loading = false;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly dialogRef: DialogRef<InternalNetworkDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      actionType: ActionType;
      name: string;
      cluster: string;
      namespace: string;
      oldInternalNetworkInfo: NetworkInfo;
      clusterAccess: ClusterAccess[];
    },
  ) {}

  ngOnInit() {
    this.actionType = this.data.actionType;
    this.name = this.data.name;
    this.cluster = this.data.cluster;
    this.namespace = this.data.namespace;
    this.clusterAccess = this.data.clusterAccess;
    this.oldInternalNetworkInfo = this.data.oldInternalNetworkInfo;

    this.cdr.detectChanges();
  }

  addNetwork() {
    if (!this.clusterAccess[0]) {
      this.message.error({
        content: this.translate.get('application.please_input_full_domain'),
      });
      return;
    }
    this.actionType = ActionType.Create;
    this.loading = true;
    this.addNetworkAction(this.clusterAccess[0]).subscribe(
      () => {
        this.successAction(this.translate.get('application.add_network_succ'));
        this.dialogRef.close(true);
      },
      (addError: any) => {
        this.errorAction(
          addError,
          this.translate.get('application.add_network_failed'),
        );
      },
    );
  }

  updateNetwork() {
    if (!this.clusterAccess[0]) {
      this.message.error({
        content: this.translate.get('application.please_input_full_domain'),
      });
      return;
    }
    this.loading = true;
    this.updateNetworkAction().subscribe(
      () => {
        this.successAction(
          this.translate.get('application.update_network_succ'),
        );
        this.dialogRef.close(true);
      },
      (updateError: any) => {
        this.errorAction(
          updateError,
          this.translate.get('application.update_network_failed'),
        );
      },
    );
  }

  addNetworkAction(item: any) {
    const body = {
      action: 'create',
      type: 'internal',
      newInternalNetworkInfo: {
        protocol: item.protocol,
        sourcePort: item.sourcePort,
        targetPort: item.targetPort,
        serviceName: item.serviceName,
      },
    };
    return this.api.networkAction(
      this.name,
      this.cluster,
      this.namespace,
      body,
    );
  }

  updateNetworkAction() {
    const newInternalNetworkInfo = this.clusterAccess[0];
    const body = {
      action: 'update',
      type: 'internal',
      newInternalNetworkInfo: {
        protocol: newInternalNetworkInfo.protocol,
        sourcePort: newInternalNetworkInfo.sourcePort,
        targetPort: newInternalNetworkInfo.targetPort,
        serviceName: newInternalNetworkInfo.serviceName,
      },
      oldInternalNetworkInfo: this.oldInternalNetworkInfo,
    };
    return this.api.networkAction(
      this.name,
      this.cluster,
      this.namespace,
      body,
    );
  }

  private successAction(content: string) {
    this.loading = false;
    this.message.success({
      content: content,
    });
  }

  private errorAction(error: any, title: string) {
    this.loading = false;
    this.notification.error({
      title: title,
      content: error.error.error || error.error.message,
    });
  }
}
