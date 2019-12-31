import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ContainerParams, VolumeInfo, splitImageAddress } from '@app/api';

import { UpdateImageDialogComponent } from '../application-create/update-image/update-image-dialog.component';
@Component({
  selector: 'alo-container-update-form',
  templateUrl: './container-update-form.component.html',
  styleUrls: ['./container-update-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdateFormComponent {
  @Input()
  container: any;
  @Input()
  volumeInfo: VolumeInfo[];
  @Input()
  params: ContainerParams;

  @ViewChild('form', { static: false })
  form: NgForm;

  constructor(private cdr: ChangeDetectorRef, private dialog: DialogService) {}

  vilidate() {
    return !this.form || this.form.valid;
  }

  changed() {
    return this.form.dirty;
  }

  selectImage() {
    const { address, tag } = splitImageAddress(this.container.image);
    this.dialog
      .open(UpdateImageDialogComponent, {
        size: DialogSize.Large,
        data: {
          project: this.params.namespace,
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
            this.container.image = result.tag
              ? `${result.repository_address}:${result.tag}`
              : result.repository_address;
            this.container.secret = result.secret || '';
            this.cdr.detectChanges();
          }
        },
      );
  }
}
