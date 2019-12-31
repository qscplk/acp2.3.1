import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import {
  ApplicationApiService,
  ApplicationIdentity,
  Report,
  toReports,
} from '@app/api';
import { isEmpty } from 'lodash-es';

@Component({
  templateUrl: 'yaml-edit-dialog.component.html',
  styleUrls: ['yaml-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationYamlEditDialogComponent implements OnInit {
  editorOptions = { language: 'yaml', readOnly: false };
  yaml = '';
  originalYaml = '';

  updating = false;
  updateError = false;
  updatePartSuccess = false;
  reports: Report[];

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly api: ApplicationApiService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly dialogRef: DialogRef<ApplicationYamlEditDialogComponent>,
    @Inject(DIALOG_DATA) public data: ApplicationIdentity,
  ) {}

  ngOnInit() {
    this.api.getYaml(this.data).subscribe(
      (result: string) => {
        this.yaml = this.originalYaml = result;
        this.cdr.detectChanges();
      },
      () => {
        this.notifaction.error({
          content: this.translate.get('yaml_load_fail'),
        });
      },
    );
  }

  save() {
    this.updating = true;
    this.updateError = false;
    this.updatePartSuccess = false;
    this.api.putYaml(this.data, this.yaml).subscribe(
      (results: any[]) => {
        this.reports = toReports(results);
        const errorReports = this.reports.filter(report => report.error);
        if (isEmpty(errorReports)) {
          this.dialogRef.close(true);
          return;
        } else if (errorReports.length === this.reports.length) {
          this.updateError = true;
        } else {
          this.updatePartSuccess = true;
        }
        this.cdr.detectChanges();
      },
      (error: any) => {
        this.dialogRef.close(false);
        this.notifaction.error({
          title: this.translate.get('application.application_update_fail'),
          content: error.error.error || error.error.message,
        });
      },
    );
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
