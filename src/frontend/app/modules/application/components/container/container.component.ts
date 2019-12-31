import { TranslateService } from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApplicationApiService,
  ApplicationIdentity,
  Container,
  ContainerParams,
  splitImageAddress,
} from '@app/api';

import { TerminalService } from '../../../../services';
import { UpdateImageDialogComponent } from '../application-create/update-image/update-image-dialog.component';
import { VolumeMountDialogComponent } from '../volume-mount/volume-mount-dialog.component';

import { ContainerSizeUpdateDialogComponent } from './container-size-dialog/container-size-dialog.component';

@Component({
  selector: 'alo-container',
  templateUrl: 'container.component.html',
  styleUrls: ['container.component.scss'],
})
export class ContainerComponent {
  @Input()
  params: ApplicationIdentity;

  @Input()
  resource: ContainerParams;

  @Input()
  container: Container;

  @Input()
  displayAdvanced = false;

  @Input()
  allowUpdateImage = true;

  @Input()
  displayContainerName = true;

  @Input()
  allowedUpdate: boolean;

  @Output()
  selecteLogs = new EventEmitter<any>();

  @Output()
  updated = new EventEmitter<void>();

  selectedPodName = '';

  constructor(
    private readonly terminal: TerminalService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
  ) {}

  showLogs() {
    this.selecteLogs.next({
      resourceName: this.resource.name,
      containerName: this.container.name,
      kind: this.resource.kind,
    });
  }

  onContainerSelected(podName: string) {
    this.selectedPodName = podName;
    this.showEXEC();
  }

  showEXEC() {
    this.terminal.openTerminal({
      pod: this.selectedPodName,
      container: this.container.name,
      namespace: this.resource.namespace,
      cluster: this.params.cluster,
      // Optional
      resourceName: this.resource.name,
      resourceKind: this.resource.kind,
    });
  }

  volumeMount() {
    const dialogRef = this.dialog.open(VolumeMountDialogComponent, {
      data: {
        title: this.translate.get('application.add_volume_mounts'),
        resourceKind: this.resource.kind,
        resourceName: this.resource.name,
        containerName: this.container.name,
        namespace: this.resource.namespace,
        cluster: this.params.cluster,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.updated.emit();
      }
    });
  }

  updateContainer() {
    this.router.navigate([`../../${this.resource.name}`], {
      relativeTo: this.route,
      queryParams: {
        kind: this.resource.kind,
        name: this.container.name,
      },
    });
  }

  showImageUpdate() {
    if (!this.allowedUpdate) {
      return;
    }
    const { address, tag } = splitImageAddress(this.container.image);
    this.dialog
      .open(UpdateImageDialogComponent, {
        size: DialogSize.Large,
        data: {
          project: this.params.project,
          address: address,
          tag: tag,
        },
      })
      .afterClosed()
      .subscribe(
        (result: {
          repository_name: string;
          repository_address: string;
          secret: string;
          tag: string;
        }) => {
          if (result) {
            const containerImageAddress = result.tag
              ? `${result.repository_address}:${result.tag}`
              : result.repository_address;
            this.api
              .putImage(
                this.resource.kind,
                this.resource.namespace,
                this.resource.name,
                this.container.name,
                this.params.cluster,
                {
                  image: containerImageAddress,
                },
              )
              .subscribe(
                () => {
                  this.message.success({
                    content: this.translate.get(
                      'application.container_update_success',
                    ),
                  });
                  this.updated.emit();
                },
                (error: any) => {
                  this.notifaction.error({
                    title: this.translate.get(
                      'application.container_update_fail',
                    ),
                    content: error.error.error || error.error.message,
                  });
                },
              );
          }
        },
      );
  }

  showContainerSizeUpdate(type: string) {
    if (!this.allowedUpdate) {
      return;
    }
    this.dialog
      .open(ContainerSizeUpdateDialogComponent, {
        data: {
          type: type,
          kind: this.resource.kind,
          cluster: this.params.cluster,
          namespace: this.resource.namespace,
          resources: this.container.resources,
          resourceName: this.resource.name,
          containerName: this.container.name,
        },
      })
      .afterClosed()
      .subscribe((result: boolean) => {
        if (result) {
          this.updated.emit();
        }
      });
  }
}
