import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { Report } from '@app/api';

@Component({
  templateUrl: './reports-dialog.component.html',
  styleUrls: ['./reports-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDialogComponent implements OnInit {
  title: string;
  failOrSuccess: string;
  reports: Report[];
  errorMessage = '';

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
    @Inject(DIALOG_DATA)
    public data: {
      title: string;
      failOrSuccess: string;
      reports: Report[];
    },
  ) {}

  ngOnInit() {
    this.title = this.data.title;
    this.failOrSuccess = this.data.failOrSuccess;
    this.reports = this.data.reports;
    this.cdr.detectChanges();
  }

  showReportMessage(report: Report) {
    return this.translate.get(
      `application.resource_${report.operation}_${
        report.error ? 'fail' : 'success'
      }`,
      report,
    );
  }
}
