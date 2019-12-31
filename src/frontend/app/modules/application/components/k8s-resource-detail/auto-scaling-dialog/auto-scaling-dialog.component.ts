import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  DialogService,
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
import { ApplicationApiService, ApplicationIdentity } from '@app/api';
import { POSITIVE_INT_PATTERN } from '@app/utils/patterns';
import { toNumber } from 'lodash';

@Component({
  templateUrl: './auto-scaling-dialog.component.html',
  styleUrls: ['./auto-scaling-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoScalingDialogComponent implements OnInit {
  @ViewChild('form', { static: true })
  form: NgForm;

  positiveIntPattern = POSITIVE_INT_PATTERN;
  maxReplicas: number;
  minReplicas: number;
  cpuTargetAverageUtilization: number;
  memTargetAverageUtilization: number;
  ruleSettingsEnable = {
    cpu: false,
    memory: false,
  };

  selectedRevision: string;
  submitting = false;
  constructor(
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly api: ApplicationApiService,
    private readonly dialogRef: DialogRef<AutoScalingDialogComponent>,
    private readonly dialog: DialogService,
    @Inject(DIALOG_DATA)
    public data: {
      params: ApplicationIdentity;
      podInfo: {
        current: number;
        desired: number;
      };
      originalData?: {
        name: string;
        maxReplicas: number;
        minReplicas: number;
        cpuTargetAverageUtilization: number;
        memTargetAverageUtilization: number;
      };
      isContainersRequestsEmpty?: { cpu: boolean; memory: boolean };
    },
  ) {}

  ngOnInit() {
    if (this.isUpdate) {
      this.maxReplicas = this.data.originalData.maxReplicas;
      this.minReplicas = this.data.originalData.minReplicas;
      if (this.data.originalData.cpuTargetAverageUtilization) {
        this.ruleSettingsEnable.cpu = true;
        this.cpuTargetAverageUtilization = this.data.originalData.cpuTargetAverageUtilization;
      }
      if (this.data.originalData.memTargetAverageUtilization) {
        this.ruleSettingsEnable.memory = true;
        this.memTargetAverageUtilization = this.data.originalData.memTargetAverageUtilization;
      }
    }
  }

  get isUpdate() {
    return this.data.originalData;
  }

  get hpaPayload() {
    return {
      namespace: this.data.params.namespace,
      appName: this.data.params.name,
      deploymentName: this.data.params.resourceName,
      current: this.data.podInfo.current,
      desired: this.data.podInfo.desired,
      minReplicas: toNumber(this.minReplicas) || 1,
      maxReplicas: toNumber(this.maxReplicas),
      memTargetAverageUtilization: toNumber(this.memTargetAverageUtilization),
      cpuTargetAverageUtilization: toNumber(this.cpuTargetAverageUtilization),
    };
  }

  get missingCpuRequests() {
    return (
      this.cpuTargetAverageUtilization &&
      this.data.isContainersRequestsEmpty.cpu
    );
  }

  get missingMemRequests() {
    return (
      this.memTargetAverageUtilization &&
      this.data.isContainersRequestsEmpty.memory
    );
  }

  get missingResourcesRequests() {
    if (this.missingCpuRequests && this.missingMemRequests) {
      return `CPU/${this.translate.get('memory')}`;
    }
    if (this.missingCpuRequests) {
      return 'CPU';
    }
    if (this.missingMemRequests) {
      return this.translate.get('memory');
    }
  }

  onCheckCpuRule(checked: boolean) {
    if (!checked) {
      this.cpuTargetAverageUtilization = null;
    }
  }

  onCheckMemoryRule(checked: boolean) {
    if (!checked) {
      this.memTargetAverageUtilization = null;
    }
  }

  add() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    if (this.missingCpuRequests || this.missingMemRequests) {
      this.dialog
        .confirm({
          title: this.translate.get(
            'application.add_auto_scaling_warning_title',
            {
              deploymentName: this.data.params.resourceName,
              resources: this.missingResourcesRequests,
            },
          ),
          cancelText: this.translate.get('cancel'),
          confirmText: this.translate.get('application.continue_to_add'),
        })
        .then(() => {
          this.createAction();
        })
        .catch(() => {});
    } else {
      this.createAction();
    }
  }

  createAction() {
    this.submitting = true;
    this.cdr.markForCheck();
    this.api
      .createHPA(
        this.data.params.cluster,
        this.data.params.namespace,
        this.hpaPayload,
      )
      .subscribe(
        () => {
          this.handleSuccessAction('add');
        },
        (error: any) => {
          this.handleErrorAction(error, 'add');
        },
      );
  }

  update() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    this.submitting = true;
    this.api
      .updateHPA(
        this.data.params.cluster,
        this.data.params.namespace,
        this.data.originalData.name,
        this.hpaPayload,
      )
      .subscribe(
        () => {
          this.handleSuccessAction('update');
        },
        (error: any) => {
          this.handleErrorAction(error, 'update');
        },
      );
  }

  private handleSuccessAction(action: string) {
    this.message.success({
      content: this.translate.get(
        `application.${action}_auto_scaling_successed`,
      ),
    });
    this.dialogRef.close(true);
  }

  private handleErrorAction(error: any, action: string) {
    this.submitting = false;
    this.cdr.markForCheck();
    this.notifaction.error({
      title: this.translate.get(`application.${action}_auto_scaling_failed`),
      content: error.error.error || error.error.message,
    });
  }
}
