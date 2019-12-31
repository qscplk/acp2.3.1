import { TranslateService } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AppK8sResource,
  Application,
  ApplicationApiService,
  ApplicationIdentity,
  ApplicationLogParams,
  K8sResourceMap,
  // PipelineIdentity,
} from '@app/api';
import { viewActions } from '@app/utils/code-editor-config';
import { isEmpty } from 'lodash-es';
import { delay } from 'rxjs/operators';

import { ApplicationDeleteDialogComponent } from '../application-delete/application-delete-dialog.component';
import { ApplicationYamlEditDialogComponent } from '../yaml-edit/yaml-edit-dialog.component';

@Component({
  selector: 'alo-application-detail',
  templateUrl: 'detail.component.html',
  styleUrls: ['detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDetailComponent implements OnInit, OnChanges {
  @Input()
  params: ApplicationIdentity;

  @Input()
  data: Application;

  @Input()
  allowedUpdate: boolean;

  @Output()
  updated = new EventEmitter<void>();

  @Output()
  deleted = new EventEmitter<void>();

  canStart: boolean;
  canStop: boolean;

  tabs = {
    base: 0,
    yaml: 1,
    log: 2,
  };

  othersKeywords = '';
  activeTab = this.tabs.base;
  yaml = '';
  displayOptions = { language: 'yaml', readOnly: true };
  actionsConfig = viewActions;
  resourceKinds: string[];
  logParams: ApplicationLogParams;

  constructor(
    private readonly dialog: DialogService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly api: ApplicationApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.resourceKinds = K8sResourceMap;
  }

  ngOnInit() {
    this.api.getYaml(this.params).subscribe(
      (result: string) => {
        this.yaml = result;
      },
      () => {
        this.notifaction.error({
          content: this.translate.get('yaml_load_fail'),
        });
      },
    );
  }

  ngOnChanges() {
    if (this.data) {
      this.canStart =
        this.data.appStatus.running === 0 && this.data.appStatus.pending === 0;
      this.canStop = this.data.appStatus.running !== 0;
    }
  }

  tracker(_: number, item: AppK8sResource) {
    return item.name;
  }

  updateByYaml() {
    const dialogRef = this.dialog.open(ApplicationYamlEditDialogComponent, {
      size: DialogSize.Large,
      data: this.params,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.updated.emit();
        this.message.success({
          content: this.translate.get(
            'application.application_name_update_success',
            {
              name: this.data.name,
            },
          ),
        });
      }
    });
  }

  confirmDelete() {
    const dialogRef = this.dialog.open(ApplicationDeleteDialogComponent, {
      data: {
        application: this.data,
        params: this.params,
      },
    });

    const appName = this.data.name;
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.message.success({
          content: this.translate.get(
            'application.application_name_delete_success',
            {
              name: appName,
            },
          ),
        });
        this.router.navigate(['../'], {
          relativeTo: this.route,
        });
      }
    });
  }

  // onPipelineStart(id: PipelineIdentity) {
  //   this.router.navigate(['../../pipelines', id.name], {
  //     relativeTo: this.route,
  //   });
  // }

  toggleApp(type: 'start' | 'stop') {
    this.dialog
      .confirm({
        title: this.translate.get(`application.${type}`),
        cancelText: this.translate.get('cancel'),
        confirmText: this.translate.get('application.' + type),
        confirmType: ConfirmType.Warning,
        content: this.translate.get('start_stop_confirm', {
          type: this.translate.get('application.' + type),
          kind: this.translate.get('application.application'),
          name: this.data.name,
        }),
      })
      .then(() => {
        this.cdr.detectChanges();
        this.canStart = false;
        this.canStop = false;
        this.api
          .toggleK8sResource(
            this.data.name,
            this.data.namespace,
            'applications',
            type,
            this.params.cluster,
          )
          .pipe(delay(1000))
          .subscribe(
            () => {
              this.updated.emit();
              this.cdr.detectChanges();
            },
            () => {
              this.message.error({
                content: this.translate.get('scale_fail'),
              });
              this.cdr.detectChanges();
            },
          );
      })
      .catch(() => {});
  }

  showLogs(event: {
    resourceName?: string;
    containerName?: string;
    kind?: string;
  }) {
    this.logParams = {
      application: this.data,
      cluster: this.params.cluster,
      ...event,
    };
    this.activeTab = this.tabs.log;
  }

  isEmptyNetwork(type: string) {
    switch (type) {
      case 'external':
        return isEmpty(this.data.visitAddresses.external);
      case 'internal':
        return isEmpty(this.data.visitAddresses.internal);
    }
  }
}
