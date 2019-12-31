import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, MessageService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import {
  ToolIntegrateParams,
  ToolService,
} from '@app/api/tool-chain/tool-chain-api.types';

import { IntegrateFormComponent } from '../integrate-form/integrate-form.component';

@Component({
  selector: 'alo-update-tool',
  templateUrl: 'update-tool.component.html',
  styleUrls: ['update-tool.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateToolComponent {
  @ViewChild('integrateForm', { static: false })
  form: IntegrateFormComponent;

  loading = false;

  constructor(
    @Inject(DIALOG_DATA) public toolService: ToolService,
    private readonly dialogRef: DialogRef<
      UpdateToolComponent,
      ToolIntegrateParams
    >,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  saved(ret: ToolIntegrateParams) {
    this.message.success(
      `${this.toolService.name} ${this.translate.get(
        'tool_chain.update_successful',
      )}`,
    );
    this.cdr.markForCheck();
    this.dialogRef.close(ret);
  }

  statusChange(status: string) {
    if (status === 'saving') {
      this.loading = true;
    } else {
      this.loading = false;
    }
  }

  submit() {
    this.form.submit();
  }
}
