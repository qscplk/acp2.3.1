import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, MessageService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import {
  Tool,
  ToolIntegrateParams,
  ToolType,
} from '@app/api/tool-chain/tool-chain-api.types';
import { ToolKind } from '@app/api/tool-chain/utils';

import { IntegrateFormComponent } from '../integrate-form/integrate-form.component';

@Component({
  selector: 'alo-integrate-tool',
  templateUrl: 'integrate-tool.component.html',
  styleUrls: ['integrate-tool.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrateToolComponent {
  @ViewChild('integrateForm', { static: false })
  form: IntegrateFormComponent;

  selectedType = 'all';
  selectedTool: Tool;
  loading = false;

  private readonly allTools: Tool[] = [];

  constructor(
    @Inject(DIALOG_DATA) public toolTypes: ToolType[],
    private readonly dialogRef: DialogRef<
      IntegrateToolComponent,
      ToolIntegrateParams & { kind: ToolKind }
    >,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
  ) {
    this.toolTypes.forEach(type => {
      this.allTools.push(...type.items);
    });
  }

  getCurrentTools() {
    if (this.selectedType === 'all') {
      return this.allTools;
    } else {
      return this.toolTypes.find(type => type.name === this.selectedType).items;
    }
  }

  handleSelectedToolChange(tool: Tool) {
    this.selectedTool = tool;
  }

  saved(ret: ToolIntegrateParams) {
    this.message.success(
      `${this.selectedTool.name} ${this.translate.get(
        'tool_chain.integrate_successful',
      )}`,
    );
    this.dialogRef.close({
      kind: this.selectedTool.kind,
      ...ret,
    });
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
