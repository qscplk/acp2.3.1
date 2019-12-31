import { DIALOG_DATA } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { PipelineTemplateSyncCondition } from '@app/api';
import { SyncResultCount } from '@app/modules/pipeline/components/template/basic-info/pipeline-template-basic-info.component';

@Component({
  selector: 'alo-pipeline-template-sync-report',
  templateUrl: './pipeline-template-sync-report.component.html',
  styleUrls: [
    './pipeline-template-sync-report.component.scss',
    '../../../shared-style/fields.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateSyncReportComponent {
  columns = ['result', 'name', 'type', 'version', 'action'];

  syncResultCount: SyncResultCount;
  conditions: PipelineTemplateSyncCondition[];
  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      conditions: PipelineTemplateSyncCondition[];
      count: SyncResultCount;
    },
  ) {
    this.conditions = this.data.conditions;
    this.syncResultCount = this.data.count;
  }
}
