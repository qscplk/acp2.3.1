import { TranslateService } from '@alauda/common-snippet';
import { DialogService, MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApplicationApiService, ApplicationIdentity, Report } from '@app/api';
import { safeLoadAll } from 'js-yaml';
import { get, isEmpty } from 'lodash-es';

import { ReportsDialogComponent } from '../../reports-dialog/reports-dialog.component';
import { APPLICATION_NAME_RULE } from '@app/utils/patterns';

@Component({
  selector: 'alo-create-application-by-yaml',
  templateUrl: 'by-yaml.component.html',
  styleUrls: [
    'by-yaml.component.scss',
    '../../../shared-style/mutate-page-bottom-buttons.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateApplicationByYamlComponent {
  @Input()
  params: ApplicationIdentity;

  @Output()
  saved = new EventEmitter<string>();

  @Output()
  canceled = new EventEmitter<void>();

  @ViewChild('form', { static: true })
  form: NgForm;

  yaml = '';
  editorOptions = { language: 'yaml' };
  creating = false;
  createError = false;
  reports: Report[];
  model = {
    appName: '',
    displayName: '',
  };
  // app的label为 appName.namespace 总长不超过63 因此 appName 的长度 = (62 - namespace 的长度)
  get nameRule() {
    const maxLength = 62 - get(this.params, 'namespace.length', 0);
    return APPLICATION_NAME_RULE(maxLength);
  }

  constructor(
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly dialog: DialogService,
    private readonly api: ApplicationApiService,
  ) {}

  create() {
    this.form.onSubmit(null);
    if (this.form.valid) {
      const resources = safeLoadAll(this.yaml)
        .filter((resource: any) => !!resource)
        .map((resource: any) => ({
          ...resource,
          metadata: {
            ...resource.metadata,
            namespace: this.params.namespace,
          },
        }));

      if (isEmpty(resources)) {
        this.message.error({
          content: this.translate.get('application_yaml_invalid'),
        });
        return;
      }

      const body = {
        objectMeta: {
          name: this.model.appName,
        },
        typeMeta: {
          kind: 'application',
        },
        resources: resources,
        source: 'yaml',
        description: this.model.displayName,
      };

      this.creating = true;
      this.cdr.detectChanges();
      this.api
        .createApplicationWithYaml(
          this.params.cluster,
          this.params.namespace,
          body,
        )
        .subscribe(
          (results: any) => {
            this.reports = get(results, 'result.items', []).map(
              (item: any) => ({
                name: item.name,
                type: item.kind,
                operation: item.action,
                error: item.error,
              }),
            );
            this.createError = !isEmpty(
              this.reports.filter(report => report.error),
            );
            if (!this.createError) {
              this.saved.emit(this.model.appName);
            } else {
              this.dialog.open(ReportsDialogComponent, {
                data: {
                  title: this.translate.get(
                    'application.application_name_create_fail',
                    { name: this.model.appName },
                  ),
                  failOrSuccess: 'fail',
                  reports: this.reports,
                },
              });
            }
            this.creating = false;
            this.cdr.detectChanges();
          },
          (error: any) => {
            this.notifaction.error({
              title: this.translate.get('application_create_fail'),
              content: error.error.error || error.error.message,
            });
            this.creating = false;
            this.cdr.detectChanges();
          },
        );
    }
  }

  reCreate() {
    this.dialog.closeAll();
    this.create();
  }

  cancel() {
    this.dialog.closeAll();
  }
}
