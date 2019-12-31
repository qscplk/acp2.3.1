import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
} from '@angular/core';
import { StringMap } from '@app/api';

@Component({
  selector: 'alo-update-labels',
  templateUrl: './update-labels-dialog.component.html',
  styleUrls: ['./update-labels-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateLabelsDialogComponent {
  updating = false;

  @Input() title: string;
  @Input() labels: StringMap = {};
  @Input() onUpdate: (labels: StringMap) => Promise<any> = async _labels => {};

  constructor(private cdr: ChangeDetectorRef) {}

  async onConfirm() {
    this.updating = true;
    await this.onUpdate(this.labels);
    this.updating = false;
    this.cdr.markForCheck();
  }
}
