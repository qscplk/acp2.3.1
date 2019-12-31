import { DialogService, DialogSize } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PipelineHistory } from '@app/api';
import { LogsComponent } from '@app/modules/pipeline/components/logs/logs.component';
import { getHistoryStatus } from '@app/modules/pipeline/utils';

@Component({
  selector: 'alo-history-preview',
  templateUrl: './history-preview.component.html',
  styleUrls: [
    './history-preview.component.scss',
    '../../shared-style/fields.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPreviewComponent {
  @Input()
  histories: PipelineHistory[];
  @Input()
  project: string;
  @Input()
  pipelineName: string;
  @Input()
  category: string;
  @Input()
  type: 'script' | 'multi-branch' = 'script';
  @Input()
  viewLogsPermission: boolean;

  get lastStatus() {
    return this.histories[0].status;
  }

  constructor(private dialog: DialogService) {}

  getHistoryStatusIcon(phase: string) {
    return getHistoryStatus(phase).icon;
  }

  openLogs(history: PipelineHistory) {
    this.dialog.open(LogsComponent, {
      size: DialogSize.Large,
      data: history,
    });
  }
}
