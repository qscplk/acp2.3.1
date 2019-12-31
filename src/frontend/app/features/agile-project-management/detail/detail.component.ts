import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import { ProjectManagementBinding } from '@app/api/project-management/project-management.types';
import { Observable } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgileProjectManagementIssueDetailComponent {
  routeParams$ = this.activatedRoute.paramMap.pipe(
    map(param => ({
      project: param.get('project'),
      bindingName: param.get('binding'),
      issueKey: param.get('key'),
    })),
    publishReplay(1),
    refCount(),
  );

  issueDetail$ = this.routeParams$.pipe(
    switchMap(params => {
      const { project, bindingName, issueKey } = params;
      return this.projectManagementApiService.getIssueDetailByKey(
        project,
        bindingName,
        issueKey,
      );
    }),
    publishReplay(1),
    refCount(),
  );

  binding$: Observable<ProjectManagementBinding> = this.routeParams$.pipe(
    switchMap(params => {
      const { project, bindingName } = params;
      return this.projectManagementApiService.getBinding(project, bindingName);
    }),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectManagementApiService: ProjectManagementApiService,
  ) {}
}
