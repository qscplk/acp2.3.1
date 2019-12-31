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
  selector: 'alo-template-resource-report',
  templateUrl: './template-resource-report.component.html',
  styleUrls: ['./template-resource-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateResourceReportComponent {
  @Input()
  title: string;

  @Input()
  failOrSuccess: string;

  @Input()
  reports: Report[];

  @Input()
  errorMessage: string;

  @Output()
  create = new EventEmitter<void>();

  @Output()
  detail = new EventEmitter<void>();

  @Output()
  delete = new EventEmitter<void>();

  @Output()
  back = new EventEmitter<void>();

  constructor(private readonly translate: TranslateService) {}

  viewDetail() {
    this.detail.emit();
  }

  reCreate() {
    this.create.emit();
  }

  deleteApplication() {
    this.delete.emit();
  }

  backToList() {
    this.back.emit();
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
