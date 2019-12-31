import { Sort } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CodeRepository } from '@app/api/code/code-api.types';

@Component({
  selector: 'alo-code-repository-list',
  templateUrl: 'repository-list.component.html',
  styleUrls: ['repository-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeRepositoryListComponent {
  private _data: CodeRepository[] = [];
  @Input()
  get data() {
    return this._data;
  }
  set data(val) {
    if (!val) {
      return;
    }
    this._data = this.sortData(val, this.currentSort);
  }

  columns = ['name', 'address', 'capacity'];

  currentSort: Sort = {
    direction: 'asc',
    active: 'name',
  };

  sortData(data: CodeRepository[], sort: Sort) {
    return [...data].sort((a, b) => {
      const stringA = `${a.namespace}/${a.name}`;
      const stringB = `${b.namespace}/${b.name}`;
      return sort.direction === 'asc'
        ? stringA.localeCompare(stringB)
        : stringB.localeCompare(stringA);
    });
  }

  trackByFn(_: number, item: CodeRepository) {
    return `${item.namespace}/${item.name}`;
  }
}
