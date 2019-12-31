import { TranslateService } from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Report } from '@app/api';

@Component({
  selector: 'alo-application-resource-report-detail',
  templateUrl: './resource-report-detail.component.html',
  styleUrls: ['./resource-report-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationResourceReportDetailComponent {
  @Input()
  failOrSuccess: string;

  @Input()
  reports: Report[];

  @Input()
  errorMessage: string;

  constructor(private readonly translate: TranslateService) {}

  showReportMessage(report: Report) {
    return this.translate.get(
      `application.resource_${report.operation.toLocaleLowerCase()}_${
        report.error ? 'fail' : 'success'
      }`,
      report,
    );
  }
}
