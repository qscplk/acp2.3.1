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
  Application,
  ApplicationApiService,
  ApplicationIdentity,
  Report,
  toReports,
} from '@app/api';
import { get, isEmpty } from 'lodash-es';

@Component({
  templateUrl: './application-delete-dialog.component.html',
  styleUrls: ['./application-delete-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDeleteDialogComponent implements OnInit {
  resources: Array<{
    name: string;
    type: string;
  }> = [];

  columns = ['name', 'type'];
  deleting = false;
  deleteError = false;
  reports: Report[];
  sortParams = {
    active: 'type',
    direction: 'asc',
  };

  checkedMap: any = {};
  yamlResources: any;
  allResourceSelected = true;

  constructor(
    private readonly api: ApplicationApiService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogRef: DialogRef<ApplicationDeleteDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      application: Application;
      params: ApplicationIdentity;
    },
  ) {}

  ngOnInit() {
    this.api.getJsonYaml(this.data.params).subscribe(
      (result: string) => {
        this.yamlResources = result || [];
        this.initResource();
        this.cdr.detectChanges();
      },
      () => {
        this.notifaction.warning({
          content: this.translate.get('yaml_load_fail'),
        });
      },
    );
  }

  initResource() {
    this.yamlResources.forEach((item: any) => {
      this.checkedMap[`${item.metadata.name}:${item.kind}`] = true;
    });
    this.sortChange(this.sortParams);
  }

  sortChange(event: { active: string; direction: string }) {
    const comparator =
      event.direction === 'desc'
        ? <T>(a: T, b: T) => (a === b ? 0 : a < b ? 1 : -1)
        : <T>(a: T, b: T) => (a === b ? 0 : a > b ? 1 : -1);
    this.resources = [...this.resources].sort((a, b) =>
      comparator(get(a, event.active), get(b, event.active)),
    );
  }

  delete() {
    this.deleting = true;
    const body: any = [];
    this.yamlResources.forEach((item: any) => {
      if (!this.checkedMap[`${item.metadata.name}:${item.kind}`]) {
        body.push(item);
      }
    });
    this.api
      .delete(this.data.params, {
        removeLabelResources: body,
      })
      .subscribe(
        (results: any[]) => {
          this.reports = toReports(results);
          this.deleteError = !isEmpty(
            this.reports.filter(report => report.error),
          );
          if (!this.deleteError) {
            this.dialogRef.close(true);
          } else {
            this.cdr.detectChanges();
          }
        },
        (error: any) => {
          this.dialogRef.close(false);
          this.notifaction.error({
            title: this.translate.get('application.application_delete_fail'),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  selecteAll() {
    this.allResourceSelected = !this.allResourceSelected;
    this.yamlResources.forEach((item: any) => {
      this.checkedMap[
        `${item.metadata.name}:${item.kind}`
      ] = this.allResourceSelected;
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
