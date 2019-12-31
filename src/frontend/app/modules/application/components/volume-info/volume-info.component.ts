import { TranslateService } from '@alauda/common-snippet';
import { DialogService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { Container, ContainerParams, VolumeInfo } from '@app/api';

import { VolumeMountDialogComponent } from '../volume-mount/volume-mount-dialog.component';

enum volumeMountTypes {
  PVC = 'PersistentVolumeClaim',
  ConfigMap = 'ConfigMap',
  Secret = 'Secret',
  HostPath = 'HostPath',
}

@Component({
  selector: 'alo-volume-info',
  templateUrl: './volume-info.component.html',
  styleUrls: ['./volume-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolumeInfoComponent implements OnChanges {
  @Input()
  data: VolumeInfo[];

  @Input()
  container: Container;

  @Input()
  resource: ContainerParams;

  @Input()
  canAction = false;

  @Output()
  updated = new EventEmitter<void>();

  constructor(
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges() {
    this.cdr.detectChanges();
  }

  editVolumeMount(index: number) {
    const dialogRef = this.dialog.open(VolumeMountDialogComponent, {
      data: {
        title: this.translate.get('application.add_volume_mounts'),
        resourceKind: this.resource.kind,
        resourceName: this.resource.name,
        containerName: this.container.name,
        cluster: this.resource.cluster,
        namespace: this.resource.namespace,
        isEdit: true,
        editData: this.data[index],
      },
    });
    dialogRef.afterClosed().subscribe((result: VolumeInfo) => {
      if (result) {
        this.data[index] = result;
        this.updated.emit();
        this.cdr.detectChanges();
      }
    });
  }

  deleteVolumeMount(index: number) {
    this.data.splice(index, 1);
    this.updated.emit();
  }

  getTypetranlate(type: volumeMountTypes) {
    switch (type) {
      case volumeMountTypes.HostPath:
        return this.translate.get('hostpath');
      case volumeMountTypes.ConfigMap:
        return this.translate.get('application.configmap');
      case volumeMountTypes.Secret:
        return this.translate.get('application.secret');
      case volumeMountTypes.PVC:
        return this.translate.get('persistent_volume_claim');
    }
  }

  refreshInfo() {
    this.cdr.detectChanges();
  }
}
