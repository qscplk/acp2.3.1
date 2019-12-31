import { Sort } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CodeQualityApiService, CodeQualityProject } from '@app/api';
import debug from 'debug';
import { map, tap } from 'rxjs/operators';

import { status, statusColor } from '../../utils/mappers';
import {
  compareByDate,
  compareByStatus,
} from '../../utils/project-sort-methods';

const log = debug('code-quality:project-list:');

interface QueryParams {
  namespace: string;
  bindingName: string;
  keywords: string;
  sort: Sort;
}

@Component({
  selector: 'alo-code-quality-project-list',
  templateUrl: 'project-list.component.html',
  styleUrls: ['project-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityProjectListComponent {
  @Input()
  get namespace() {
    return this.params.namespace;
  }
  set namespace(val: string) {
    this.params = {
      ...this.params,
      namespace: val,
    };
  }

  @Input()
  get bindingName() {
    return this.params.bindingName;
  }
  set bindingName(val: string) {
    this.params = {
      ...this.params,
      bindingName: val,
    };
  }

  @Input()
  get keywords() {
    return this.params.keywords;
  }
  set keywords(val: string) {
    this.params = {
      ...this.params,
      keywords: val,
    };
  }

  @Input()
  get sort() {
    return this.params.sort;
  }
  set sort(val: Sort) {
    this.params = {
      ...this.params,
      sort: val,
    };
  }

  constructor(private codeQualityApi: CodeQualityApiService) {}

  params: QueryParams = {
    namespace: '',
    bindingName: '',
    keywords: '',
    sort: {
      active: 'date',
      direction: 'desc',
    },
  };

  @Output()
  sortChange = new EventEmitter<Sort>();

  columns = ['repositoryName', 'status', 'date', 'link'];

  status = status;

  statusColor = statusColor();

  fetchProjects = (params: QueryParams) => {
    log('params change', params);

    const { namespace, bindingName, keywords, sort } = params;

    const filterFn = keywords
      ? (items: CodeQualityProject[]) =>
          items.filter(item => item.codeAddress.includes(keywords))
      : (items: CodeQualityProject[]) => items;

    const sortFn =
      sort.active === 'date'
        ? compareByDate(sort.direction === 'desc')
        : compareByStatus(sort.direction === 'desc');

    return this.codeQualityApi.projects
      .findByBinding(namespace, bindingName)
      .pipe(
        map(result => result.items),
        map(filterFn),
        map(items => items.slice().sort(sortFn)),
        tap(log.bind(null, 'fetch result')),
      );
  };

  identity(_: number, item: any) {
    return `${item.namespace}/${item.name}`;
  }

  onSortChange(event: Sort) {
    log('onSortChange', event);
    this.sortChange.emit(event);
  }
}
