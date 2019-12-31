import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { EditorStatus } from '@app/modules/secret';

import { ModuleEnv } from '../../module-env';

@Component({
  templateUrl: 'create-dialog.component.html',
  styleUrls: ['create-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretCreateDialogComponent {
  status: EditorStatus = 'normal';

  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      namespace: string;
      types: string[];
      env: ModuleEnv;
      tips: string;
    },
    private dialogRef: DialogRef<SecretCreateDialogComponent>,
  ) {}

  close(created = '') {
    this.dialogRef.close(created);
  }

  onStatusChange(status: EditorStatus) {
    this.status = status;
  }
}
