import { Sort } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ProjectManagementBinding,
  ProjectManagementProjectItem,
} from '@app/api/project-management/project-management.types';
import { dropDuplicateUrlSlash } from '@app/utils/url-utils';

@Component({
  selector: 'alo-project-management-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementProjectListComponent {
  private _projects: ProjectManagementProjectItem[] = [];
  @Input()
  get projects() {
    return this._projects;
  }
  set projects(value) {
    if (!value) {
      return;
    }
    this._projects = this.sortData(value, this.currentSort);
  }
  @Input()
  accessible: boolean;
  @Input()
  binding: ProjectManagementBinding;

  displayedColumns = ['projectName', 'projectId', 'projectLeader'];
  currentSort: Sort = {
    direction: 'desc',
    active: 'projectId',
  };
  dropDuplicateUrlSlash = dropDuplicateUrlSlash;

  trackById(_: number, item: ProjectManagementProjectItem) {
    return item.id;
  }

  sortData(data: ProjectManagementProjectItem[], sort: Sort) {
    return [...data].sort((a, b) =>
      sort.direction === 'desc'
        ? b.id.localeCompare(a.id)
        : a.id.localeCompare(b.id),
    );
  }

  onSortChange(sort: Sort) {
    this.currentSort = sort;
    this._projects = this.sortData(this.projects, sort);
  }
}
