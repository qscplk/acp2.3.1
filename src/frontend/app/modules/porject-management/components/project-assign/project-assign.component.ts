import { ObservableInput } from '@alauda/common-snippet';
import { TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  Inject,
} from '@angular/core';
import { NgForm } from '@angular/forms';
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
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { publishReplay, refCount, switchMap } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Component({
  selector: 'alo-project-assign',
  templateUrl: './project-assign.component.html',
  styleUrls: ['./project-assign.component.scss'],
})
export class ProjectAssignComponent implements OnChanges {
  @Input()
  namespace: string;
  @Input()
  binding: ProjectManagementBinding;
  @ObservableInput(true)
  private binding$: Observable<ProjectManagementBinding>;
  @ViewChild('ngForm', { static: false })
  ngForm: NgForm;

  options$: Observable<ProjectManagementProjects>;
  refresh$ = new BehaviorSubject<string>('');
  selected: ProjectManagementProjectInfos[] = [];

  constructor(
    private projectManagementApi: ProjectManagementApiService,
    private notification: NotificationService,
    private translate: TranslateService,
    private message: MessageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  ngOnChanges({ binding }: SimpleChanges): void {
    if (binding && binding.currentValue) {
      this.options$ = combineLatest([this.binding$, this.refresh$]).pipe(
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
      this.selected = binding.currentValue.projectManagementProjectInfos;
    }
  }

  submit() {
    this.ngForm.onSubmit(null);
    this.cdr.markForCheck();
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

  getNewOptions() {
    this.refresh$.next(null);
  }

  trackByName(option: any) {
    return option.name;
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
}
