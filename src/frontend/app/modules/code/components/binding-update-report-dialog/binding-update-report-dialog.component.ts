import { DIALOG_DATA, DialogService } from '@alauda/ui';
import { Component, Inject } from '@angular/core';
import { CodeRepoRelatedResource } from '@app/api/code/code-api.types';

@Component({
  templateUrl: 'binding-update-report-dialog.component.html',
  styleUrls: ['binding-update-report-dialog.component.scss'],
})
export class CodeBindingUpdateReportDialogComponent {
  columns = ['name', 'type'];

  constructor(
    @Inject(DIALOG_DATA) public data: CodeRepoRelatedResource[],
    private dialog: DialogService,
  ) {}

  resourceIdentity(_: number, item: CodeRepoRelatedResource) {
    return `${item.kind}/${item.namespace}/${item.name}`;
  }

  close() {
    this.dialog.closeAll();
  }
}
