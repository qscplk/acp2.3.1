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

import {
  coverage,
  duplication,
  size,
  status,
  statusColor,
} from '../../utils/mappers';
import {
  compareByDate,
  compareByStatus,
} from '../../utils/project-sort-methods';

const log = debug('code-quality:project-card-list');

interface QueryParams {
  namespace: string;
  keywords: string;
  sort: string;
}

@Component({
  selector: 'alo-code-quality-project-card-list',
  templateUrl: 'project-card-list.component.html',
  styleUrls: ['project-card-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityProjectCardListComponent {
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
  get sortActive() {
    return this.params.sort;
  }
  set sortActive(val: string) {
    this.params = {
      ...this.params,
      sort: val,
    };
  }

  @Output()
  sortChange = new EventEmitter<string>();

  @Output()
  keywordsChange = new EventEmitter<string>();

  params: QueryParams = {
    namespace: '',
    keywords: '',
    sort: 'date',
  };

  constructor(private codeQualityApi: CodeQualityApiService) {}

  coverage = coverage;

  duplication = duplication;

  size = size;

  status = status;

  statusColor = statusColor();

  fetchProjects = (params: QueryParams) => {
    log('params change', params);

    // TODO: temp filter and sort at frontend
    // const query = getQuery(
    //   filterBy('spec.project.codeAddress', params.keywords),
    //   sortBy(params.sort, params.sort === 'date'),
    // );

    const filterFn = params.keywords
      ? (items: CodeQualityProject[]) =>
          items.filter(item => item.codeAddress.includes(params.keywords))
      : (items: CodeQualityProject[]) => items;

    const sortFn =
      params.sort === 'date' ? compareByDate(true) : compareByStatus();

    return this.codeQualityApi.projects.find(params.namespace).pipe(
      map(result => result.items),
      map(filterFn),
      map(items => items.slice().sort(sortFn)),
      tap(log.bind(null, 'fetch result')),
    );
  };

  sort(active: string) {
    this.sortChange.next(active);
  }

  search(event: any) {
    this.keywordsChange.next(event);
  }

  projectIdentity(_: number, item: CodeQualityProject) {
    return `${item.namespace}/${item.name}`;
  }
}
