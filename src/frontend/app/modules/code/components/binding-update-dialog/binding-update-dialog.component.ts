import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

@Component({
  templateUrl: 'binding-update-dialog.component.html',
  styleUrls: ['binding-update-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBindingUpdateDialogComponent {
  status = '';

  constructor(
    @Inject(DIALOG_DATA)
    public data: { name: string; namespace: string; service: string },
    private dialogRef: DialogRef<CodeBindingUpdateDialogComponent>,
  ) {}

  close(saved = false) {
    this.dialogRef.close(saved);
  }

  onStatusChange(status: string) {
    this.status = status;
  }
}
