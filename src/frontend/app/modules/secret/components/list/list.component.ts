import { Sort } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Secret, SecretApiService, SecretType } from '@app/api';
import { filterBy, getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { Subject } from 'rxjs';

import { SecretActions } from '../../services/acitons';

export interface QueryParams {
  search_by: string;
  keywords: string;
  sort: string;
  direction: string;
  page: number;
  page_size: number;
}

@Component({
  selector: 'alo-secret-list',
  templateUrl: 'list.component.html',
  styleUrls: ['list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretListComponent implements OnChanges {
  @Input()
  get params(): QueryParams {
    return this._params.query;
  }

  set params(value: QueryParams) {
    if (!value) {
      return;
    }

    this._params = {
      ...this._params,
      query: value,
    };
    this.searchBy = value.search_by;
  }

  @Input()
  get project(): string {
    return this._params.project;
  }

  set project(value: string) {
    this._params = {
      ...this._params,
      project: value,
    };
  }

  @Input()
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };

  @Input()
  itemRoute: (item: Secret) => string[];

  @Output()
  paramsChange = new EventEmitter<Partial<QueryParams>>();

  get pageIndex() {
    return Math.max(0, this._params.query.page - 1);
  }

  get pageSize() {
    return Math.max(20, this._params.query.page_size);
  }

  get columns() {
    return !this.project
      ? ['name', 'project', 'type', 'creationTimestamp', 'actions']
      : ['name', 'type', 'creationTimestamp', 'actions'];
  }

  _params = {
    project: '',
    query: {
      search_by: 'name',
      keywords: '',
      sort: 'name',
      direction: 'asc',
      page: 1,
      page_size: 20,
    },
  };

  searchBy = this._params.query.search_by;

  refresh$ = new Subject<void>();

  typeTranslates: Dictionary<string> = {
    [SecretType.BasicAuth]: 'secret.basic_auth',
    [SecretType.OAuth2]: 'secret.oauth2',
    [SecretType.SSH]: 'secret.ssh',
    [SecretType.DockerConfig]: 'secret.docker_config',
    '*': 'secret.opaque',
  };

  constructor(
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
  ) {}

  fetchSecrets = ({
    project,
    query,
  }: {
    project: string;
    query: QueryParams;
  }) => {
    return this.secretApi.find(
      getQuery(
        filterBy(
          query.search_by === 'display_name' ? 'displayName' : 'name',
          query.keywords || '',
        ),
        sortBy(query.sort, query.direction === 'desc'),
        pageBy(
          Math.max(0, this._params.query.page - 1),
          Math.max(20, this._params.query.page_size),
        ),
      ),
      project,
    );
  };

  secretTracker(_: number, secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.params && changes.params.currentValue) {
      this.searchBy = changes.params.currentValue.search_by;
    }
  }

  onSortChange(sort: Sort) {
    this.paramsChange.emit({
      sort: sort.active,
      direction: sort.direction,
    });
  }

  currentPageChange(page: number) {
    this.paramsChange.emit({
      page,
    });
  }

  pageSizeChange(pageSize: number) {
    this.paramsChange.emit({
      page: 1,
      page_size: pageSize,
    });
  }

  onSearch(keywords: string) {
    if (
      keywords !== this.params.keywords ||
      this.searchBy !== this.params.search_by
    ) {
      this.paramsChange.emit({
        search_by: this.searchBy,
        keywords,
        page: 1,
      });
    } else {
      this.refresh$.next();
    }
  }

  updateDisplayName(item: Secret) {
    this.secretActions.updateDisplayName(item).subscribe(result => {
      if (result) {
        this.refresh$.next();
      }
    });
  }

  updateData(item: Secret) {
    // eslint-disable-next-line sonarjs/no-identical-functions
    this.secretActions.updateData(item).subscribe(result => {
      if (result) {
        this.refresh$.next();
      }
    });
  }

  delete(item: Secret) {
    // eslint-disable-next-line sonarjs/no-identical-functions
    this.secretActions.delete(item).subscribe(result => {
      if (result) {
        this.paramsChange.emit({
          page: 1,
        });
        this.refresh$.next();
      }
    });
  }

  getItemIcon(item: Secret) {
    return `icons/${item.private ? 'secret-private.svg' : 'secret-public.svg'}`;
  }

  getItemType(item: Secret) {
    return this.typeTranslates[item.type] || this.typeTranslates['*'];
  }
}
