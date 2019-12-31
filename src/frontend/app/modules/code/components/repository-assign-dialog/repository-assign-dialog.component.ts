import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

@Component({
  templateUrl: 'repository-assign-dialog.component.html',
  styleUrls: ['repository-assign-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeRepositoryAssignDialogComponent {
  constructor(
    @Inject(DIALOG_DATA) public data: { name: string; namespace: string },
    private dialogRef: DialogRef<CodeRepositoryAssignDialogComponent>,
  ) {}

  close(saved = false) {
    this.dialogRef.close(saved);
  }
}
