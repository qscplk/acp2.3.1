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
import { ApplicationApiService, ContainerSize } from '@app/api';
import { get } from 'lodash-es';

@Component({
  templateUrl: './container-size-dialog.component.html',
  styleUrls: ['./container-size-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerSizeUpdateDialogComponent implements OnInit {
  @ViewChild('form', { static: true })
  form: NgForm;

  memUnits = ['Gi', 'Mi'];
  memValue: number;
  memUnitValue = 'Mi';
  cpuUnits = ['m', 'c'];
  cpuValue: number;
  cpuUnitValue = 'm';
  submitting = false;

  constructor(
    private readonly dialogRef: DialogRef<ContainerSizeUpdateDialogComponent>,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(DIALOG_DATA)
    public data: {
      type: string;
      kind: string;
      cluster: string;
      namespace: string;
      resources: ContainerSize;
      resourceName: string;
      containerName: string;
    },
  ) {}

  ngOnInit() {
    this.initResource();
  }

  isRequest() {
    return this.data.type === 'requests';
  }

  resourcesToValue() {
    const resources: ContainerSize = { requests: {}, limits: {} };
    if (this.isRequest()) {
      this.setValueToResources(resources, 'requests');
    } else {
      this.setValueToResources(resources, 'limits');
    }
    return resources;
  }

  setValueToResources(resources: ContainerSize, type: 'requests' | 'limits') {
    if (this.memValue) {
      resources[type].memory = `${this.memValue}${this.memUnitValue}`;
    }
    if (this.cpuValue) {
      resources[type].cpu = `${this.cpuValue}${
        this.cpuUnitValue === 'c' ? '' : this.cpuUnitValue
      }`;
    }
  }

  initResource() {
    if (this.isRequest()) {
      if (get(this.data.resources, 'requests.memory')) {
        const { value, unit } = this.handleResourceMemorySize(
          get(this.data.resources, 'requests.memory'),
        );
        this.memValue = value;
        this.memUnitValue = unit;
      }
      if (get(this.data.resources, 'requests.cpu')) {
        const { value, unit } = this.handleResourceCpuSize(
          get(this.data.resources, 'requests.cpu'),
        );
        this.cpuValue = value;
        this.cpuUnitValue = unit;
      }
    } else {
      if (get(this.data.resources, 'limits.memory')) {
        const { value, unit } = this.handleResourceMemorySize(
          get(this.data.resources, 'limits.memory'),
        );
        this.memValue = value;
        this.memUnitValue = unit;
      }
      if (get(this.data.resources, 'limits.cpu')) {
        const { value, unit } = this.handleResourceCpuSize(
          get(this.data.resources, 'limits.cpu'),
        );
        this.cpuValue = value;
        this.cpuUnitValue = unit;
      }
    }
  }

  handleResourceMemorySize(value: string) {
    let resourceValue: number;
    let resourceUnit: string;
    if (value.endsWith('i')) {
      resourceUnit = value.slice(-2);
      resourceValue = parseFloat(value.slice(0, -2));
    } else {
      resourceUnit = value.slice(-1);
      resourceValue = parseFloat(value.slice(0, -1));
    }
    return { value: resourceValue, unit: resourceUnit };
  }

  handleResourceCpuSize(value: string) {
    const resourceUnit = value.endsWith('m') ? 'm' : 'c';
    const resourceValue =
      resourceUnit === 'm' ? parseFloat(value.slice(0, -1)) : parseFloat(value);
    return { value: resourceValue, unit: resourceUnit };
  }

  update() {
    this.submitting = true;
    const payload = this.isRequest()
      ? { requests: this.resourcesToValue().requests }
      : { limits: this.resourcesToValue().limits };
    this.api
      .putContainerSize(
        this.data.kind,
        this.data.cluster,
        this.data.namespace,
        this.data.resourceName,
        this.data.containerName,
        payload,
      )
      .subscribe(
        () => {
          this.message.success({
            content: this.translate.get('application.container_update_success'),
          });
          this.dialogRef.close(true);
        },
        (error: any) => {
          this.notifaction.error({
            title: this.translate.get('application.container_update_fail'),
            content: error.error.error || error.error.message,
          });
          this.submitting = false;
          this.cdr.markForCheck();
        },
      );
  }
}
