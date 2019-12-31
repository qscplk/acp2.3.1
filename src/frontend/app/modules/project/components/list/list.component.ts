import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Project } from '@app/api';

const defaultData = (): { items: Project[]; length: number } => ({
  items: [],
  length: 0,
});

@Component({
  selector: 'alo-project-list',
  templateUrl: 'list.component.html',
  styleUrls: ['list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'alo-project-list',
})
export class ProjectListComponent {
  @Input()
  params: {
    searchBy: string;
    keywords: string;
    pageIndex: number;
    pageSize: number;
    sort: string;
    direction: string;
  };

  private _data = defaultData();
  @Input()
  get data() {
    return this._data;
  }
  set data(value: { items: Project[]; length: number }) {
    this._data = value || defaultData();
  }

  @Input() itemRoute: (item: Project) => string[];
  @Input() plainTable: boolean;

  @Output()
  sortChange = new EventEmitter<{
    sort: string;
    direction: string;
  }>();

  columns = ['name', 'manager', 'creationTimestamp', 'description'];

  tracker(_: number, item: Project) {
    return item.name;
  }

  onSort({ active, direction }: { active: string; direction: string }) {
    this.sortChange.emit({
      sort: active,
      direction,
    });
  }
}
