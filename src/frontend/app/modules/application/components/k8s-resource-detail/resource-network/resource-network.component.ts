import { TranslateService } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  ApplicationApiService,
  ClusterAccess,
  PublicIPAccess,
  PublicNetworkAccess,
  VisitAddresses,
} from '@app/api';
import { isEmpty } from 'lodash-es';

import { ExternalIPDialogComponent } from './external-ip-dialog.component';
import { ExternalNetworkDialogComponent } from './external-network-dialog.component';
import { InternalNetworkDialogComponent } from './internal-network-dialog.component';

interface NetworkInfos {
  externalNetworkInfos: NetworkInfo[];
  internalNetworkInfos: NetworkInfo[];
  externalNodePortInfos: NetworkInfo[];
}

export interface NetworkInfo {
  createdAt?: string;
  protocol?: string;
  serviceName: string;
  type?: string;
  address?: string;
  ingressName?: string;
  path?: string;
  domainPrefix?: string;
  domainName?: string;
  host?: string;
  sourcePort?: number;
  targetPort: number;
  nodePort?: number;
}

enum NetworkType {
  External = 'external',
  Internal = 'internal',
  NodePort = 'nodePort',
}

enum ActionType {
  Create = 'create',
  Update = 'update',
}
@Component({
  selector: 'alo-resource-network',
  templateUrl: './resource-network.component.html',
  styleUrls: ['./resource-network.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceNetworkComponent implements OnChanges {
  @Input()
  networkInfo: NetworkInfos;

  @Input()
  visitAddresses: VisitAddresses;

  @Input()
  name: string;

  @Input()
  cluster: string;

  @Input()
  namespace: string;

  @Input()
  allowedUpdate: boolean;

  @Output()
  updated = new EventEmitter<void>();

  columns = ['address', 'type', 'port', 'time', 'actions'];
  publicNetworkAccess: PublicNetworkAccess[] = [];
  clusterAccess: ClusterAccess[] = [];
  publicIPAccess: PublicIPAccess[] = [];
  data: NetworkInfo[] = [];
  oldExternalNetworkInfo: NetworkInfo;
  oldInternalNetworkInfo: NetworkInfo;
  oldExternalNodePortInfo: NetworkInfo;

  actionType: ActionType;
  loading = false;

  constructor(
    private readonly translate: TranslateService,
    private readonly dialog: DialogService,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
  ) {}

  ngOnChanges() {
    if (this.networkInfo) {
      this.data = this.handleNetwork(this.networkInfo);
    }
  }

  networkIdentity(_: number, item: any) {
    return item.visit_address;
  }

  openPublicNetworkAccess() {
    this.dialog
      .open(ExternalNetworkDialogComponent, {
        size: DialogSize.Big,
        data: {
          actionType: this.actionType,
          name: this.name,
          cluster: this.cluster,
          namespace: this.namespace,
          oldExternalNetworkInfo: this.oldExternalNetworkInfo,
          publicNetworkAccess: this.publicNetworkAccess,
        },
      })
      .afterClosed()
      .subscribe((result: boolean) => {
        this.publicNetworkAccess = [];
        if (result) {
          this.updated.emit();
        }
      });
  }

  openClusterAccess() {
    this.dialog
      .open(InternalNetworkDialogComponent, {
        size: DialogSize.Big,
        data: {
          actionType: this.actionType,
          name: this.name,
          cluster: this.cluster,
          namespace: this.namespace,
          oldInternalNetworkInfo: this.oldInternalNetworkInfo,
          clusterAccess: this.clusterAccess,
        },
      })
      .afterClosed()
      .subscribe((result: boolean) => {
        this.clusterAccess = [];
        if (result) {
          this.updated.emit();
        }
      });
  }

  openPublicIPAccess() {
    this.dialog
      .open(ExternalIPDialogComponent, {
        size: DialogSize.Big,
        data: {
          actionType: this.actionType,
          name: this.name,
          cluster: this.cluster,
          namespace: this.namespace,
          oldExternalNodePortInfo: this.oldExternalNodePortInfo,
          publicIPAccess: this.publicIPAccess,
        },
      })
      .afterClosed()
      .subscribe((result: boolean) => {
        this.publicIPAccess = [];
        if (result) {
          this.updated.emit();
        }
      });
  }

  openAddNetwork(type: string) {
    this.actionType = ActionType.Create;
    switch (type) {
      case NetworkType.External:
        this.openPublicNetworkAccess();
        break;
      case NetworkType.Internal:
        this.openClusterAccess();
        break;
      case NetworkType.NodePort:
        this.openPublicIPAccess();
        break;
    }
  }

  openUpdateNetwork(item: NetworkInfo) {
    this.actionType = ActionType.Update;
    switch (item.type) {
      case NetworkType.External:
        this.publicNetworkAccess[0] = {
          domainPrefix: item.domainPrefix,
          domainName: item.domainName,
          host: item.host,
          path: item.path,
          targetPort: item.targetPort,
        };
        this.oldExternalNetworkInfo = {
          domainPrefix: item.domainPrefix,
          domainName: item.domainName,
          host: item.host,
          path: item.path,
          targetPort: item.targetPort,
          ingressName: item.ingressName,
          serviceName: item.serviceName,
        };
        this.openPublicNetworkAccess();
        break;
      case NetworkType.Internal:
        this.clusterAccess[0] = {
          protocol: item.protocol,
          sourcePort: item.sourcePort,
          targetPort: item.targetPort,
          serviceName: item.serviceName,
        };
        this.oldInternalNetworkInfo = {
          protocol: item.protocol,
          sourcePort: item.sourcePort,
          targetPort: item.targetPort,
          serviceName: item.serviceName,
        };
        this.openClusterAccess();
        break;
      case NetworkType.NodePort:
        this.publicIPAccess[0] = {
          protocol: item.protocol,
          sourcePort: item.sourcePort,
          nodePort: item.nodePort,
        };
        this.oldExternalNodePortInfo = {
          protocol: item.protocol,
          sourcePort: item.sourcePort,
          targetPort: item.targetPort,
          nodePort: item.nodePort,
          serviceName: item.serviceName,
        };
        this.openPublicIPAccess();
        break;
    }
  }

  deleteNetwork(item: NetworkInfo) {
    this.dialog
      .confirm({
        title: this.translate.get('application.delete_network_confirm'),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('confirm'),
        confirmType: ConfirmType.Danger,
        beforeConfirm: (resolve, reject) => {
          this.deleteNetworkAction(item).subscribe(
            () => {
              this.message.success({
                content: this.translate.get('application.delete_network_succ'),
              });
              this.updated.emit();
              resolve();
            },
            (err: any) => {
              this.notification.error({
                title: this.translate.get('application.delete_network_failed'),
                content: err.error.error || err.error.message,
              });
              reject();
            },
          );
        },
      })
      .then(() => {})
      .catch(() => {});
  }

  deleteNetworkAction(item: NetworkInfo) {
    let body;
    switch (item.type) {
      case NetworkType.External:
        body = {
          action: 'delete',
          type: NetworkType.External,
          oldExternalNetworkInfo: {
            domainPrefix: item.domainPrefix,
            domainName: item.domainName,
            host: item.host,
            path: item.path,
            targetPort: item.targetPort,
            ingressName: item.ingressName,
            serviceName: item.serviceName,
          },
        };
        break;
      case NetworkType.Internal:
        body = {
          action: 'delete',
          type: NetworkType.Internal,
          oldInternalNetworkInfo: {
            protocol: item.protocol,
            sourcePort: item.sourcePort,
            targetPort: item.sourcePort,
            serviceName: item.serviceName,
          },
        };
        break;
      case NetworkType.NodePort:
        body = {
          action: 'delete',
          type: NetworkType.NodePort,
          oldExternalNodePortInfo: {
            protocol: item.protocol,
            sourcePort: item.sourcePort,
            targetPort: item.sourcePort,
            serviceName: item.serviceName,
            nodePort: item.nodePort,
          },
        };
    }
    return this.api.networkAction(
      this.name,
      this.cluster,
      this.namespace,
      body,
    );
  }

  private handleNetwork(networkInfo: NetworkInfos) {
    const external = !isEmpty(networkInfo.externalNetworkInfos)
      ? networkInfo.externalNetworkInfos.map((item, index: number) => {
          item.type = NetworkType.External;
          item.address = this.visitAddresses.external[index];
          return item;
        })
      : [];
    const internal = !isEmpty(networkInfo.internalNetworkInfos)
      ? networkInfo.internalNetworkInfos.map((item, index: number) => {
          item.type = NetworkType.Internal;
          item.address = this.visitAddresses.internal[index];
          return item;
        })
      : [];
    const nodePort = !isEmpty(networkInfo.externalNodePortInfos)
      ? networkInfo.externalNodePortInfos.map((item, index: number) => {
          item.type = NetworkType.NodePort;
          item.address = this.visitAddresses.nodeport[index];
          return item;
        })
      : [];
    return external.concat(internal).concat(nodePort);
  }
}
