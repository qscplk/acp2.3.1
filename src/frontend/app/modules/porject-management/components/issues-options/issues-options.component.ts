import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ToolBinding } from '@app/api';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import {
  ALL_SYMBOL,
  IssuesQueryOptions,
  ProjectManagementProjectInfos,
} from '@app/api/project-management/project-management.types';
import { get } from 'lodash-es';
import { Subject } from 'rxjs';

@Component({
  selector: 'alo-project-management-issues-options',
  templateUrl: './issues-options.component.html',
  styleUrls: ['./issues-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuesOptionsComponent implements OnChanges {
  @Input()
  bind: ToolBinding;
  @Output()
  optionsChanged = new EventEmitter<IssuesQueryOptions>();

  ALL_SYMBOL = ALL_SYMBOL;
  refresh$ = new Subject<void>();
  searchBy = 'issuekey';
  params = {
    type: 'all',
  };
  projects: ProjectManagementProjectInfos[];
  query: IssuesQueryOptions = {
    project: ALL_SYMBOL,
    type: ALL_SYMBOL,
    priority: ALL_SYMBOL,
    status: ALL_SYMBOL,
    issuekey: '',
    summary: '',
  };
  keywords: '';

  constructor(
    private projectManagementApiService: ProjectManagementApiService,
  ) {}

  ngOnChanges({ bind }: SimpleChanges): void {
    if (bind && bind.currentValue) {
      this.projects = get(
        bind.currentValue,
        ['__original', 'spec', 'projectManagementProjectInfos'],
        [],
      );
      this.optionsChanged.emit(this.query);
    }
  }

  fetchOptions = ({ type }: { type: string }) => {
    const { namespace, name } = this.bind;
    return this.projectManagementApiService.getIssuesOptions(
      namespace,
      name,
      type,
    );
  };

  selectedProjectChange(project: string | typeof ALL_SYMBOL) {
    this.query = {
      ...this.query,
      project,
    };
    this.optionsChanged.emit(this.query);
  }

  selectedTypeChange(type: string) {
    this.query = {
      ...this.query,
      type,
    };
    this.optionsChanged.emit(this.query);
  }

  selectedPriorityChange(priority: string) {
    this.query = {
      ...this.query,
      priority,
    };
    this.optionsChanged.emit(this.query);
  }

  selectedStatusChange(status: string) {
    this.query = {
      ...this.query,
      status,
    };
    this.optionsChanged.emit(this.query);
  }

  searchByChanged(searchBy: string, other: string) {
    this.searchBy = searchBy;
    this.keywords = '';
    (this.query as any)[other] = '';
  }

  clearSearchBy() {
    const searchBy = this.searchBy;
    (this.query as any)[searchBy] = '';
    this.optionsChanged.emit(this.query);
  }

  onSearch() {
    const searchBy = this.searchBy;
    this.query = {
      ...this.query,
      [searchBy]: this.keywords,
    };
    this.optionsChanged.emit(this.query);
  }
}
