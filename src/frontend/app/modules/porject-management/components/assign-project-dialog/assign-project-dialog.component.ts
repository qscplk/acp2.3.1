import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import {
  ProjectItems,
  ProjectManagementBinding,
  ProjectManagementProjectInfos,
  ProjectManagementProjects,
} from '@app/api/project-management/project-management.types';
import { mapBindingParamsToK8SResource } from '@app/api/project-management/utils';
import { BindingKind } from '@app/api/tool-chain/utils';
import { dropRight, takeRight } from 'lodash-es';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { publishReplay, refCount, switchMap } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Component({
  templateUrl: './assign-project-dialog.component.html',
  styleUrls: ['./assign-project-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignProjectDialogComponent {
  options$: Observable<ProjectManagementProjects>;
  refresh$ = new BehaviorSubject<string>('');
  selected: ProjectManagementProjectInfos[] =
    this.binding.projectManagementProjectInfos || [];

  constructor(
    @Inject(DIALOG_DATA) public binding: ProjectManagementBinding,
    private projectManagementApi: ProjectManagementApiService,
    private notification: NotificationService,
    private translate: TranslateService,
    private message: MessageService,
    private dialogRef: DialogRef,
    private router: Router,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {
    this.options$ = combineLatest([of(this.binding), this.refresh$]).pipe(
      switchMap(([projectBinding]) => {
        const { secret, service } = projectBinding;
        const secretSegments = secret.split('/');
        const rightString = takeRight(secretSegments, 1).join();
        const secretNameSpace = dropRight(secretSegments, 1).join();
        return this.projectManagementApi.getProjectsByBinding(
          service,
          rightString,
          secretNameSpace,
        );
      }),
      publishReplay(1),
      refCount(),
    );
  }

  sortById(option: ProjectManagementProjects) {
    if (!option) {
      return [];
    }
    return option.items.sort((a: ProjectItems, b: ProjectItems) => {
      const leftId = parseInt(a.metadata.annotations.id, 10);
      const rightId = parseInt(b.metadata.annotations.id, 10);
      return rightId - leftId;
    });
  }

  getRefObj(obj: ProjectItems) {
    return {
      name: obj.metadata.name,
      id: obj.metadata.annotations.id,
      key: obj.metadata.annotations.key,
    };
  }

  trackByName(option: any) {
    return option.name;
  }

  getNewOptions() {
    this.refresh$.next(null);
  }

  submit() {
    if (!this.selected.length) {
      return;
    }
    const { namespace, service, name, description, secret } = this.binding;
    const payload = mapBindingParamsToK8SResource(
      {
        namespace,
        name,
        service,
        description,
        secret,
      },
      this.constants,
    );
    payload.spec.ProjectManagementProjectInfos = this.selected;
    this.projectManagementApi.updateBinding(payload).subscribe(
      () => {
        this.dialogRef.close(true);
        this.message.success(
          this.translate.get('project_management.assign_project_success'),
        );
        this.router.navigate([
          '/admin/projects',
          namespace,
          BindingKind.ProjectManagement,
          name,
        ]);
      },
      error => {
        this.notification.error({
          title: 'project_management.assign_project_failed',
          content: error.error.error || error.error.message,
        });
      },
    );
  }
}
