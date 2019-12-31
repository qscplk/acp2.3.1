import { Sort } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ImageRepository } from '@app/api/registry/registry-api.types';
import {
  getFullTagPath,
  getImagePathPrefix,
  getImagePathSuffix,
} from '@app/modules/registry/utils';

@Component({
  selector: 'alo-repository-list',
  templateUrl: 'repository-list.component.html',
  styleUrls: ['repository-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepositoryListComponent {
  private _repositories: ImageRepository[] = [];
  @Input()
  get repositories() {
    return this._repositories;
  }
  set repositories(val) {
    if (!val) {
      return;
    }
    this._repositories = this.sortData(val, this.currentSort);
  }

  currentSort: Sort = {
    direction: 'asc',
    active: 'image',
  };

  getFullTagPath = getFullTagPath;

  getImagePathPrefix = getImagePathPrefix;

  getImagePathSuffix = getImagePathSuffix;

  onSortChange(sort: Sort) {
    this.currentSort = sort;
    this._repositories = this.sortData(this.repositories, sort);
  }

  sortData(data: ImageRepository[], sort: Sort) {
    return [...data].sort((a, b) => {
      const stringA = `${a.endpoint}/${a.image}`;
      const stringB = `${b.endpoint}/${b.image}`;
      return sort.direction === 'asc'
        ? stringA.localeCompare(stringB)
        : stringB.localeCompare(stringA);
    });
  }

  trackByPath(_: number, item: ImageRepository) {
    return `${item.endpoint}/${item.name}`;
  }
}
