import { TranslateService } from '@alauda/common-snippet';
import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
} from '@angular/core';
import {
  PipelineTestReport,
  ReportsApiService,
  TestReportParams,
} from '@app/api';
import { statusColor } from '@app/modules/code-quality/utils/mappers';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-history-test-report',
  templateUrl: './history-test-report.component.html',
  styleUrls: ['./history-test-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineHistoryTestReportComponent {
  @Input()
  get project() {
    return this.params.project;
  }

  set project(val: string) {
    this.params = {
      ...this.params,
      project: val,
    };
  }

  @Input()
  get name() {
    return this.params.name;
  }

  set name(val: string) {
    this.params = {
      ...this.params,
      name: val,
    };
  }

  statusColor = statusColor(true);
  params = {
    start: '0',
    limit: '50',
    name: '',
    project: '',
  };

  starter: { [key: string]: number } = {
    FAILED: 0,
    SKIPPED: 0,
    PASSED: 0,
    REGRESSION: 0,
    FIXED: 0,
  };

  concatReport: { [key: string]: boolean } = {
    FAILED: true,
    SKIPPED: true,
    PASSED: true,
    REGRESSION: true,
    FIXED: true,
  };

  constructor(
    private readonly reportsApi: ReportsApiService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  fetchStatus = (params: TestReportParams) =>
    this.reportsApi.getPipelineTestReport(params).pipe(
      tap(report => {
        ['FAILED', 'SKIPPED', 'PASSED', 'REGRESSION', 'FIXED'].forEach(type => {
          this.concatReport[type] =
            report[type].length >= parseInt(this.params.limit, 10);
        });
      }),
    );

  summary(data: PipelineTestReport, context: string[]) {
    if (!data) {
      return context.map(c => ({ status: c, count: 0 }));
    }

    return context.map(item => ({
      status: item.toUpperCase(),
      count:
        (item === 'Failed'
          ? data.SUMMARY[item] + data.SUMMARY.ExistingFailed
          : data.SUMMARY[item]) || 0,
      expand: {
        regressions: data.SUMMARY.Regressions || 0,
        fixed: data.SUMMARY.Fixed || 0,
      },
    }));
  }

  loadMore(data: PipelineTestReport, item: string) {
    const itemUpperCase = item.toUpperCase();
    const limit = parseInt(this.params.limit, 10);
    this.starter[itemUpperCase] = this.starter[itemUpperCase] + limit;
    this.params.start = this.starter[itemUpperCase].toString();
    this.reportsApi.getPipelineTestReport(this.params).subscribe(
      reports => {
        data[itemUpperCase] = data[itemUpperCase].concat(
          reports[itemUpperCase],
        );
        item = item === 'Failed' ? 'ExistingFailed' : item;
        this.concatReport[itemUpperCase] =
          data[itemUpperCase].length < reports.SUMMARY[item];
        this.cdr.markForCheck();
      },
      error => {
        this.notification.error({
          title: this.translate.get('pipeline.api_error'),
          content: error.error.error || error.error.message,
        });
      },
    );
  }

  trackLogs(index: number) {
    return index;
  }
}
