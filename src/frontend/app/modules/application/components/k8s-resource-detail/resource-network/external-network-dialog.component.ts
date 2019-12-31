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
import { ApplicationApiService, PublicNetworkAccess } from '@app/api';

import { NetworkInfo } from './resource-network.component';

enum ActionType {
  Create = 'create',
  Update = 'update',
}

@Component({
  templateUrl: './external-network-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExternalNetworkDialogComponent implements OnInit {
  publicNetworkAccess: PublicNetworkAccess[] = [];
  oldExternalNetworkInfo: NetworkInfo;
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
    private readonly dialogRef: DialogRef<ExternalNetworkDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      actionType: ActionType;
      name: string;
      cluster: string;
      namespace: string;
      oldExternalNetworkInfo: NetworkInfo;
      publicNetworkAccess: PublicNetworkAccess[];
    },
  ) {}

  ngOnInit() {
    this.actionType = this.data.actionType;
    this.name = this.data.name;
    this.cluster = this.data.cluster;
    this.namespace = this.data.namespace;
    this.publicNetworkAccess = this.data.publicNetworkAccess;
    this.oldExternalNetworkInfo = this.data.oldExternalNetworkInfo;

    this.cdr.detectChanges();
  }

  addNetwork() {
    if (!this.publicNetworkAccess[0]) {
      this.message.error({
        content: this.translate.get('application.please_input_full_domain'),
      });
      return;
    }
    this.actionType = ActionType.Create;
    this.loading = true;
    this.addNetworkAction(this.publicNetworkAccess[0]).subscribe(
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
    if (!this.publicNetworkAccess[0]) {
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
    const domainPrefix = item.domainPrefix
      ? `${item.domainPrefix.split('.')[0]}.`
      : '';
    const domainName = item.domainName.replace(/^\./, '');
    const body = {
      action: 'create',
      type: 'external',
      newExternalNetworkInfo: {
        domainPrefix: item.domainPrefix || '',
        domainName,
        host: `${domainPrefix}${
          domainName.slice(0, 2) === '*.' ? domainName.slice(1) : domainName
        }`,
        path: item.path,
        targetPort: item.targetPort,
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
    const newExternalNetworkInfo = this.publicNetworkAccess[0];
    const domainPrefix = newExternalNetworkInfo.domainPrefix
      ? `${newExternalNetworkInfo.domainPrefix.split('.')[0]}.`
      : '';
    const domainName = newExternalNetworkInfo.domainName.replace(/^\./, '');
    const body = {
      action: 'update',
      type: 'external',
      newExternalNetworkInfo: {
        domainPrefix: newExternalNetworkInfo.domainPrefix || '',
        domainName,
        host: `${domainPrefix}${
          domainName.startsWith('*.') ? domainName.slice(1) : domainName
        }`,
        path: newExternalNetworkInfo.path,
        targetPort: newExternalNetworkInfo.targetPort,
      },
      oldExternalNetworkInfo: this.oldExternalNetworkInfo,
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
