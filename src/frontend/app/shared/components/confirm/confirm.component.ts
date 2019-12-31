import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

interface ConfirmData {
  icon: string;
  title: string;
  okText: string;
  okType: 'primary' | 'default' | 'error';
  description: string;
}

@Component({
  templateUrl: 'confirm.component.html',
  styleUrls: ['confirm.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmComponent {
  constructor(
    private dialogRef: DialogRef<ConfirmComponent>,
    @Inject(DIALOG_DATA) public data: ConfirmData,
  ) {}

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
