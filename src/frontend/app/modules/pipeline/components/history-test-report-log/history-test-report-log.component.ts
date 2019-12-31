import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PipelineTestReport, TestReport } from '@app/api';

@Component({
  selector: 'alo-pipeline-history-test-report-log',
  templateUrl: './history-test-report-log.component.html',
  styleUrls: ['./history-test-report-log.component.scss'],
})
export class PipelineHistoryTestReportLogComponent implements OnChanges {
  @Input()
  data: PipelineTestReport;

  @Input()
  item: string;

  active = false;
  activeItems: boolean[];

  ngOnChanges({ data, item }: SimpleChanges): void {
    if (data && data.currentValue) {
      this.activeItems = data.currentValue[item.currentValue.toUpperCase()].map(
        () => false,
      );
    }
  }

  getStatusIcon(log: TestReport) {
    switch (log.status) {
      case 'PASSED':
      case 'FIXED':
        return 'check_s';
      case 'FAILED':
      case 'REGRESSION':
        return 'close_8';
      case 'SKIPPED':
        return 'basic:node_ingress_gateway';
      default:
        return 'check_s';
    }
  }

  getCounts(type: string) {
    return (
      (type === 'Failed'
        ? this.data.SUMMARY[type] + this.data.SUMMARY.ExistingFailed
        : this.data.SUMMARY[type]) || 0
    );
  }

  trackLogs(index: number) {
    return index;
  }

  clickLog(log: TestReport, idx: number) {
    if (log.errorStackTrace) {
      this.activeItems[idx] = !this.activeItems[idx];
    }
  }
}
