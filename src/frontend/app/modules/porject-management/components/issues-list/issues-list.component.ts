import { Sort } from '@alauda/ui';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ToolBinding } from '@app/api';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import {
  ALL_SYMBOL,
  IssueItem,
  IssuesQueryOptions,
} from '@app/api/project-management/project-management.types';
import { dropDuplicateUrlSlash } from '@app/utils/url-utils';

@Component({
  selector: 'alo-project-management-issues-list',
  templateUrl: './issues-list.component.html',
  styleUrls: ['./issues-list.component.scss'],
})
export class IssuesListComponent implements OnChanges {
  @Input()
  bind: ToolBinding;

  @Input()
  options: IssuesQueryOptions;

  displayedColumns = [
    'id',
    'summary',
    'belong_project',
    'type',
    'priority',
    'status',
    'assign',
    'updated',
    'reporter',
  ];

  pagination = {
    page: '1',
    pagesize: '20',
  };

  query: { [key: string]: string };
  dropDuplicateUrlSlash = dropDuplicateUrlSlash;

  constructor(
    private readonly projectManagementApiService: ProjectManagementApiService,
  ) {}

  ngOnChanges({ options }: SimpleChanges): void {
    if (options && options.currentValue) {
      const { project, type, priority, status } = options.currentValue;
      this.query = {
        ...this.pagination,
        ...options.currentValue,
        project: this.getOptions(project),
        type: this.getOptions(type),
        priority: this.getOptions(priority),
        status: this.getOptions(status),
      };
      this.query.orderby = 'updated';
      this.query.sort = 'DESC';
    }
  }

  getOptions(option: string | typeof ALL_SYMBOL) {
    return option === ALL_SYMBOL ? '' : option;
  }

  fetchIssuesList = () => {
    const { namespace, name } = this.bind;
    return this.projectManagementApiService.getIssuesList(
      namespace,
      name,
      this.query,
    );
  };

  currentPageChange(page: number) {
    this.query = {
      ...this.query,
      page: page.toString(),
    };
  }

  pageSizeChange(pagesize: number) {
    this.query = {
      ...this.query,
      page: '1',
      pagesize: pagesize.toString(),
    };
  }

  onSortChange(sort: Sort) {
    this.query = {
      ...this.query,
      orderby: sort.active,
      sort: sort.direction,
    };
  }

  trackById(_: number, item: IssueItem) {
    return item.key;
  }
}
