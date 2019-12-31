import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { PipelineTemplate } from '@app/api';

@Component({
  selector: 'alo-pipeline-template-detail',
  templateUrl: './pipeline-template-detail.component.html',
  styleUrls: ['./pipeline-template-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateDetailComponent {
  customLabelIndex = ['sonarqube'];
  template: PipelineTemplate;
  showSelect = false;
  disableSelect = false;
  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      template: PipelineTemplate;
      showSelect?: boolean;
      disableSelect?: boolean;
    },
    private readonly translate: TranslateService,
    private readonly dialogRef: DialogRef,
  ) {
    this.template = data.template;
    this.showSelect = data.showSelect;
    this.disableSelect = data.disableSelect;
  }

  key() {
    return this.translate.locale === 'en' ? 'en' : 'zh-CN';
  }

  select() {
    this.dialogRef.close(this.template);
  }

  close() {
    this.dialogRef.close();
  }
}
