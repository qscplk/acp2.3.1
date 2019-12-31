import { TranslateService } from '@alauda/common-snippet';
import { DialogService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { Container, ContainerParams, VolumeInfo } from '@app/api';

import { VolumeInfoComponent } from '../../volume-info/volume-info.component';
import { VolumeMountDialogComponent } from '../../volume-mount/volume-mount-dialog.component';

@Component({
  selector: 'alo-container-update-volume',
  templateUrl: './container-update-volume.component.html',
  styleUrls: ['./container-update-volume.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContainerUpdateVolumeComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ContainerUpdateVolumeComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdateVolumeComponent
  implements ControlValueAccessor, Validator {
  @Input()
  containerParams: ContainerParams;

  @Input()
  container: Container;

  @ViewChild('volumeInfoRef', { static: true })
  volumeInfoComp: VolumeInfoComponent;

  volume: VolumeInfo[];
  propagateChange = (_: any) => {};

  constructor(
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  writeValue(volume: VolumeInfo[]): void {
    this.volume = volume;
    if (volume) {
      this.cdr.detectChanges();
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(): void {}

  validate(): ValidationErrors {
    return null;
  }

  addVolumeMount() {
    const dialogRef = this.dialog.open(VolumeMountDialogComponent, {
      data: {
        title: this.translate.get('application.add_volume_mounts'),
        resourceKind: this.containerParams.kind,
        resourceName: this.containerParams.name,
        containerName: this.container.name,
        namespace: this.containerParams.namespace,
        isEdit: true,
        cluster: this.containerParams.cluster,
      },
    });
    dialogRef.afterClosed().subscribe((result: VolumeInfo) => {
      if (result) {
        this.volume.push(result);
        this.volumeInfoComp.refreshInfo();
        this.volumeChange();
      }
    });
  }

  volumeChange() {
    this.propagateChange(this.volume);
  }
}
