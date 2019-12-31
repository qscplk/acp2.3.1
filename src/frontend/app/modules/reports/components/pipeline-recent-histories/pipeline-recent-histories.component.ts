import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { PipelineApiService } from '@app/api';
import { getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-recent-histories',
  templateUrl: 'pipeline-recent-histories.component.html',
  styleUrls: [
    '../../../../shared/dashboard.scss',
    'pipeline-recent-histories.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineRecentHistoriesComponent {
  @Input()
  project = '';

  @Output()
  actions = new EventEmitter<{ type: string; payload: any }>();

  icons = {
    Queued: 'basic:hourglass_half_circle_s',
    Pending: 'basic:play_circle_s',
    Running: 'basic:sync_circle_s',
    Failed: 'basic:close_circle_s',
    Complete: 'check_circle_s',
    Cancelled: 'basic:minus_circle_s',
    Aborted: 'basic:paused_circle_s',
    Unknown: 'basic:question_circle_s',
  };

  constructor(private pipelineApi: PipelineApiService) {}

  fetchPipelineRecentHistories = (project: string) =>
    this.pipelineApi
      .getPipelineHistories(
        project,
        getQuery(sortBy('startedAt', true), pageBy(0, 4)),
      )
      .pipe(map(res => res.histories));

  getDuration(startedAt: string, finishedAt: string) {
    return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  }

  openLog(item: any) {
    this.actions.emit({
      type: 'pipeline/open-log',
      payload: item,
    });
  }
}
