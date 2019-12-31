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
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  ApplicationApiService,
  ApplicationIdentity,
  Container,
  ContainerParams,
  K8sResourceDetail,
  ResourceLogParams,
  StringMap,
  splitImageAddress,
} from '@app/api';
import { safeDump } from 'js-yaml';
import { get } from 'lodash-es';
import { delay } from 'rxjs/operators';

import { UpdateLabelsDialogComponent } from '../update-labels/update-labels-dialog.component';

import { AutoScalingDialogComponent } from './auto-scaling-dialog/auto-scaling-dialog.component';
import { RollbackDialogComponent } from './resource-rollback-dialog/rollback-dialog.component';

@Component({
  selector: 'alo-k8s-resource-detail',
  templateUrl: 'k8s-resource-detail.component.html',
  styleUrls: ['k8s-resource-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class K8sResourceDetailComponent implements OnChanges {
  @Input()
  params: ApplicationIdentity;

  @Input()
  data: any;

  @Input()
  allowedUpdate: boolean;

  @Output()
  updated = new EventEmitter<void>();

  tabs = {
    base: 0,
    yaml: 1,
    config: 2,
    log: 3,
    event: 4,
  };

  activeTab = this.tabs.base;
  yaml = '';
  selectedContainer = '';
  folded = true;
  logParams: ResourceLogParams;
  displayOptions = { language: 'yaml', readOnly: true };
  result: K8sResourceDetail;
  containerParams: ContainerParams;
  resourceYamlJson: any;

  showStartStopButton: boolean;
  canStart: boolean;
  canStop: boolean;

  constructor(
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly api: ApplicationApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: DialogService,
  ) {}

  ngOnChanges() {
    if (this.data) {
      const k8sData = this.data.data.data;
      this.initParams();
      if (
        k8sData.kind.toLocaleLowerCase() === 'deployment' ||
        k8sData.kind.toLocaleLowerCase() === 'statefulset'
      ) {
        this.showStartStopButton = true;
        this.canStart = k8sData.spec.replicas === 0;
        this.canStop = k8sData.spec.replicas !== 0;
      } else {
        this.showStartStopButton = false;
      }
    }
  }

  initParams() {
    this.result = this.data.data;
    if (!this.selectedContainer) {
      this.selectedContainer = this.result.containers[0].name;
    }
    this.logParams = {
      namespace: this.params.namespace,
      cluster: this.params.cluster,
      pods: this.result.podInfo.pods,
      containers: this.result.containers,
    };
    this.containerParams = {
      name: this.result.objectMeta.name,
      kind: this.params.kind,
      namespace: this.params.namespace,
      podInfo: this.result.podInfo,
    };
    this.api.getJsonYaml(this.params).subscribe(
      (result: any) => {
        if (this.params.kind) {
          this.resourceYamlJson = result.find((resource: any) => {
            return (
              resource.kind.toLocaleLowerCase() ===
              this.params.kind.toLocaleLowerCase()
            );
          });
          this.yaml = safeDump(this.resourceYamlJson);
          this.cdr.markForCheck();
        }
      },
      () => {
        this.notifaction.error({
          content: this.translate.get('yaml_load_fail'),
        });
      },
    );
    this.cdr.detectChanges();
  }

  get ready() {
    return true;
  }

  get multiContainer() {
    return get(this.result, 'containers', []).length > 1;
  }

  get isContainersRequestsCPUEmpty() {
    let result = true;
    const containers: Container[] = get(this.result, 'containers', []);
    containers.forEach(container => {
      const cpu = get(container, 'resources.requests.cpu');
      result = result && cpu;
    });
    return !result;
  }

  get isContainersRequestsMemEmpty() {
    let result = true;
    const containers: Container[] = get(this.result, 'containers', []);
    containers.forEach(container => {
      const memory = get(container, 'resources.requests.memory');
      result = result && memory;
    });
    return !result;
  }

  get isContainersRequestsEmpty() {
    return {
      cpu: this.isContainersRequestsCPUEmpty,
      memory: this.isContainersRequestsMemEmpty,
    };
  }

  changeTab(tab: number) {
    this.activeTab = tab;
  }

  changeContainer(name: string) {
    this.selectedContainer = name;
  }

  containerIdentity(_: number, item: Container) {
    return item.name;
  }

  showLogs(event: {
    resourceName?: string;
    containerName?: string;
    kind?: string;
  }) {
    this.logParams.selectedContainerName = event.containerName;
    this.activeTab = this.tabs.log;
  }

  refreshResourceDetail() {
    this.updated.emit();
  }

  toggleFold() {
    this.folded = !this.folded;
    this.cdr.detectChanges();
  }

  toggleApp(type: 'start' | 'stop') {
    const k8sData = this.data.data.data;
    this.dialog
      .confirm({
        title: this.translate.get(type),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('application.' + type),
        confirmType: ConfirmType.Warning,
        content: this.translate.get('start_stop_confirm', {
          type: this.translate.get('application.' + type),
          kind: this.translate.get(
            'application.' + k8sData.kind.toLocaleLowerCase(),
          ),
          name: k8sData.metadata.name,
        }),
      })
      .then(() => {
        this.cdr.detectChanges();
        this.canStart = false;
        this.canStop = false;
        this.api
          .toggleK8sResource(
            k8sData.metadata.name,
            k8sData.metadata.namespace,
            k8sData.kind.toLocaleLowerCase(),
            type,
            this.params.cluster,
          )
          .pipe(delay(1000))
          .subscribe(
            () => {
              this.updated.emit();
              this.cdr.detectChanges();
            },
            () => {
              this.message.error({
                content: this.translate.get('scale_fail'),
              });
              this.cdr.detectChanges();
            },
          );
      })
      .catch(() => {});
  }

  updateLabels() {
    const dialogRef = this.dialog.open(UpdateLabelsDialogComponent);
    dialogRef.componentInstance.labels = this.result.objectMeta.labels;
    dialogRef.componentInstance.title = this.translate.get(
      'application.update_labels',
    );
    dialogRef.componentInstance.onUpdate = async (labels: StringMap) => {
      try {
        const body = { ...this.resourceYamlJson };
        body.metadata.labels = labels;
        this.api
          .patchLabelsAndAnnotations(
            {
              apiVersion: this.result.data.apiVersion,
              kind: this.params.kind,
              cluster: this.params.cluster,
              namespace: this.params.namespace,
              name: this.params.resourceName,
            },
            body,
          )
          .subscribe(() => {
            this.updateSuccess(dialogRef);
          });
      } catch (error) {
        this.notifaction.error({ content: error.error.error || error.error });
      }
    };
  }

  updateAnnotations() {
    const dialogRef = this.dialog.open(UpdateLabelsDialogComponent);
    dialogRef.componentInstance.labels = this.result.objectMeta.annotations;
    dialogRef.componentInstance.title = this.translate.get(
      'application.update_annotations',
    );
    dialogRef.componentInstance.onUpdate = async (annotations: StringMap) => {
      try {
        const body = { ...this.resourceYamlJson };
        body.metadata.annotations = annotations;
        this.api
          .patchLabelsAndAnnotations(
            {
              apiVersion: this.result.data.apiVersion,
              kind: this.params.kind,
              cluster: this.params.cluster,
              namespace: this.params.namespace,
              name: this.params.resourceName,
            },
            body,
          )
          .subscribe(() => {
            this.updateSuccess(dialogRef);
          });
      } catch (error) {
        this.notifaction.error({ content: error.error.error || error.error });
      }
    };
  }

  rollback() {
    this.api
      .getHistoryRevision(
        this.params.cluster,
        this.params.namespace,
        this.params.resourceName,
      )
      .subscribe(
        (result: {
          total: number;
          items: Array<{
            creationTimestamp: string;
            revision: string;
            images: string[];
          }>;
        }) => {
          if (result.total === 0) {
            this.dialog
              .confirm({
                title: this.translate.get('application.no_history_revision'),
                confirmText: this.translate.get('i_know'),
                confirmType: ConfirmType.Primary,
                cancelButton: false,
              })
              .catch(() => {});
          } else {
            this.dialog
              .open(RollbackDialogComponent, {
                size: DialogSize.Big,
                data: {
                  params: this.params,
                  total: result.total,
                  items: result.items
                    .map(item => {
                      return {
                        creationTimestamp: item.creationTimestamp,
                        revision: item.revision,
                        tags: item.images.map(
                          image => splitImageAddress(image).tag || 'latest',
                        ),
                      };
                    })
                    .sort((item1, item2) => {
                      return (
                        parseInt(item2.revision, 10) -
                        parseInt(item1.revision, 10)
                      );
                    })
                    .slice(0, 10),
                },
              })
              .afterClosed()
              .subscribe((isUpdated: boolean) => {
                if (isUpdated) {
                  this.updated.emit();
                }
              });
          }
        },
        (error: any) => {
          this.notifaction.error({
            title: this.translate.get(
              'application.get_rollback_history_failed',
            ),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  addAutoScaling() {
    this.dialog
      .open(AutoScalingDialogComponent, {
        size: DialogSize.Large,
        data: {
          params: this.params,
          podInfo: {
            current: this.result.podInfo.current,
            desired: this.result.podInfo.desired,
          },
          isContainersRequestsEmpty: this.isContainersRequestsEmpty,
        },
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.updated.emit();
        }
      });
  }

  updateAutoScaling() {
    let cpuTargetAverageUtilization: number;
    let memTargetAverageUtilization: number;
    const hpa = this.result.horizontalPodAutoscalerList[0];
    get(hpa, 'spec.metrics', []).forEach((resource: any) => {
      if (get(resource, 'resource.name') === 'cpu') {
        cpuTargetAverageUtilization = get(
          resource,
          'resource.targetAverageUtilization',
        );
      }
      if (get(resource, 'resource.name') === 'memory') {
        memTargetAverageUtilization = get(
          resource,
          'resource.targetAverageUtilization',
        );
      }
    });
    this.dialog
      .open(AutoScalingDialogComponent, {
        size: DialogSize.Large,
        data: {
          params: this.params,
          podInfo: {
            current: this.result.podInfo.current,
            desired: this.result.podInfo.desired,
          },
          originalData: {
            name: get(hpa, 'metadata.name'),
            maxReplicas: get(hpa, 'spec.maxReplicas'),
            minReplicas: get(hpa, 'spec.minReplicas'),
            cpuTargetAverageUtilization: cpuTargetAverageUtilization,
            memTargetAverageUtilization: memTargetAverageUtilization,
          },
        },
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.updated.emit();
        }
      });
  }

  deleteAutoScaling() {
    this.dialog
      .confirm({
        title: this.translate.get('application.auto_scaling_delete_confirm', {
          name: this.params.name,
        }),
        content: this.translate.get(
          'application.auto_scaling_delete_confirm_content',
        ),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('delete'),
        beforeConfirm: (resolve, reject) => {
          this.api
            .deleteHPA(
              this.params.cluster,
              this.params.namespace,
              get(this.result.horizontalPodAutoscalerList[0], 'metadata.name'),
            )
            .subscribe(
              () => {
                this.message.success({
                  content: this.translate.get(
                    'application.delete_auto_scaling_successed',
                  ),
                });
                resolve();
              },
              (err: any) => {
                this.notifaction.error({
                  title: this.translate.get(
                    'application.delete_auto_scaling_successed',
                  ),
                  content: err.error.error || err.error.message,
                });
                reject();
              },
            );
        },
      })
      .then(() => {
        this.updated.emit();
      })
      .catch(() => {});
  }

  updateSuccess(dialogRef: any) {
    dialogRef.close();
    this.message.success({
      content: this.translate.get('update_succeeded'),
    });
    this.updated.emit();
  }
}
