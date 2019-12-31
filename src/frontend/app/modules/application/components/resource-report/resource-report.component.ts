import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Report } from '@app/api';

@Component({
  selector: 'alo-application-resource-report',
  templateUrl: './resource-report.component.html',
  styleUrls: ['./resource-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationResourceReportComponent {
  @Input()
  title: string;

  @Input()
  failOrSuccess: string;

  @Input()
  updateButton: string;

  @Input()
  reports: Report[];

  @Output()
  close = new EventEmitter<void>();

  @Output()
  save = new EventEmitter<void>();

  constructor(private readonly translate: TranslateService) {}

  cancel() {
    this.close.emit();
  }

  update() {
    this.save.emit();
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
