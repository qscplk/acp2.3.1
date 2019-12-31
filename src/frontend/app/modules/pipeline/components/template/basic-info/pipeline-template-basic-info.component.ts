import {
  K8sPermissionService,
  K8sResourceAction,
  publishRef,
} from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PipelineApiService, PipelineTemplateSync } from '@app/api';
import { RESOURCE_TYPES } from '@app/constants';
import { PipelineTemplateSettingComponent } from '@app/modules/pipeline/components/template/setting/pipeline-template-setting.component';
import { PipelineTemplateSyncReportComponent } from '@app/modules/pipeline/components/template/sync-report/pipeline-template-sync-report.component';
import { get } from 'lodash-es';
import { interval } from 'rxjs';
import { map, publishReplay, refCount, switchMap, tap } from 'rxjs/operators';

export interface SyncResultCount {
  success: number;
  failure: number;
  skip: number;
}

type SyncResultCountKey = 'success' | 'failure' | 'skip';
@Component({
  selector: 'alo-pipeline-template-basic-info',
  templateUrl: './pipeline-template-basic-info.component.html',
  styleUrls: [
    './pipeline-template-basic-info.component.scss',
    '../../../shared-style/fields.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateBasicInfoComponent {
  loadingStatus = ['Draft', 'Pending', 'Syncing'];
  templateSync: PipelineTemplateSync;
  syncing: boolean;
  syncResultCount: SyncResultCount;

  currentDate = interval(2000).pipe(
    map(() => new Date().getTime()),
    publishReplay(1),
    refCount(),
  );

  get templateSyncStatus() {
    return get(this.templateSync, 'status.phase', '');
  }

  @Input()
  project: string;

  @Output()
  syncChange = new EventEmitter<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pipelineApi: PipelineApiService,
    private readonly k8sPermission: K8sPermissionService,
    private readonly dialog: DialogService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  project$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('name')),
    publishRef(),
  );

  permissions$ = this.project$.pipe(
    switchMap(project =>
      this.k8sPermission.isAllowed({
        type: RESOURCE_TYPES.PIPELINETEMPLATESYNCS,
        namespace: project,
        action: [K8sResourceAction.UPDATE],
      }),
    ),
  );

  fetchData = () =>
    this.pipelineApi.templateSyncDetail(this.project).pipe(
      tap((result: PipelineTemplateSync) => {
        if (!result) {
          return;
        }
        this.setLocalStatus(result);
      }),
    );

  sync() {
    this.pipelineApi
      .templateSyncTrigger(this.project, this.templateSync.name, {
        ...this.templateSync.__original,
        status: { phase: 'Pending' },
      })
      .subscribe(
        (result: PipelineTemplateSync) => {
          this.setLocalStatus(result);
        },
        () => {},
      );
  }

  setting() {
    const ref = this.dialog.open(PipelineTemplateSettingComponent, {
      size: DialogSize.Large,
      data: {
        namespace: this.project,
        setting: this.templateSync,
      },
    });
    ref.afterClosed().subscribe(
      (result: PipelineTemplateSync) => {
        if (!result) {
          return;
        }
        this.setLocalStatus(result);
      },
      () => {},
    );
  }

  syncReport() {
    this.dialog.open(PipelineTemplateSyncReportComponent, {
      size: DialogSize.Large,
      data: {
        conditions: get(this.templateSync, 'status.conditions', []),
        count: this.syncResultCount,
      },
    });
  }

  getDateTimes(phase: string) {
    return new Date(phase || '').getTime();
  }

  private setLocalStatus(result: PipelineTemplateSync) {
    this.templateSync = result;
    const currentSyncing = this.loadingStatus.includes(
      get(result, 'status.phase', ''),
    );
    if (!currentSyncing && this.syncing) {
      this.syncChange.emit();
    }
    this.syncing = currentSyncing;
    this.syncResultCount = this.countResult(result);
    this.cdr.detectChanges();
  }

  private countResult(result: PipelineTemplateSync): SyncResultCount {
    return (get(result, 'status.conditions') || []).reduce(
      (accum: SyncResultCount, templateStatus: { status: string }) => {
        const key = this.toStatusKey(templateStatus);
        if (key) {
          return {
            ...accum,
            [key]: accum[key] + 1,
          };
        } else {
          return accum;
        }
      },
      {
        success: 0,
        failure: 0,
        skip: 0,
      },
    );
  }

  private toStatusKey(templateStatus: { status: string }): SyncResultCountKey {
    switch (templateStatus.status) {
      case 'Success':
        return 'success';
      case 'Failure':
        return 'failure';
      case 'Skip':
        return 'skip';
      case 'Deleted':
        return 'success';
      default:
    }
  }

  getTitle(syncData: PipelineTemplateSync) {
    return (
      get(syncData, 'codeRepository.name') || get(syncData, 'git.uri') || '-'
    );
  }
}
