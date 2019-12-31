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
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApplicationApiService, PublicIPAccess } from '@app/api';

import { NetworkInfo } from './resource-network.component';

enum ActionType {
  Create = 'create',
  Update = 'update',
}

@Component({
  templateUrl: './external-ip-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExternalIPDialogComponent implements OnInit {
  publicIPAccess: PublicIPAccess[] = [];
  oldExternalNodePortInfo: NetworkInfo;
  actionType: ActionType;
  name: string;
  cluster: string;
  namespace: string;
  loading = false;
  @ViewChild('form', { static: true })
  form: NgForm;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly dialogRef: DialogRef<ExternalIPDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      actionType: ActionType;
      name: string;
      cluster: string;
      namespace: string;
      oldExternalNodePortInfo: NetworkInfo;
      publicIPAccess: PublicIPAccess[];
    },
  ) {}

  ngOnInit() {
    this.actionType = this.data.actionType;
    this.name = this.data.name;
    this.cluster = this.data.cluster;
    this.namespace = this.data.namespace;
    this.publicIPAccess = this.data.publicIPAccess;
    this.oldExternalNodePortInfo = this.data.oldExternalNodePortInfo;

    this.cdr.detectChanges();
  }

  addNetwork() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    if (!this.publicIPAccess[0]) {
      this.message.error({
        content: this.translate.get('application.please_input_full_domain'),
      });
      return;
    }
    this.actionType = ActionType.Create;
    this.loading = true;
    this.addNetworkAction(this.publicIPAccess[0]).subscribe(
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
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    if (!this.publicIPAccess[0]) {
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

  addNetworkAction(item: PublicIPAccess) {
    const body = {
      action: 'create',
      type: 'nodePort',
      newExternalNodePortInfo: {
        protocol: item.protocol,
        sourcePort: item.sourcePort,
        targetPort: item.sourcePort,
        nodePort: item.nodePort,
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
    const newExternalNodePortInfo = this.publicIPAccess[0];
    const body = {
      action: 'update',
      type: 'nodePort',
      newExternalNodePortInfo: {
        protocol: newExternalNodePortInfo.protocol,
        sourcePort: newExternalNodePortInfo.sourcePort,
        targetPort: newExternalNodePortInfo.sourcePort,
        nodePort: newExternalNodePortInfo.nodePort,
      },
      oldExternalNodePortInfo: this.oldExternalNodePortInfo,
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
    this.cdr.markForCheck();
    this.notification.error({
      title: title,
      content: error.error.error || error.error.message,
    });
  }
}
