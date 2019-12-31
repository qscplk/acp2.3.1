import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
} from '@angular/core';
import { OtherResource } from '@app/api';
import { get } from 'lodash-es';

interface Sort {
  active: keyof OtherResource | '';
  direction: 'desc' | 'asc' | '';
}

@Component({
  selector: 'alo-application-other-list',
  templateUrl: 'other-list.component.html',
  styleUrls: ['other-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationOtherListComponent implements OnInit, OnChanges {
  @Input()
  keywords: string;

  @Input()
  data: OtherResource[];

  items: OtherResource[];

  sort: Sort = { active: '', direction: '' };

  columns = ['name', 'kind'];

  constructor(private readonly cdr: ChangeDetectorRef) {}

  itemIdentity(_: number, item: OtherResource) {
    return item.name;
  }

  ngOnInit() {
    this.setItems();
  }

  ngOnChanges() {
    this.setItems();
  }

  setItems() {
    const comparator =
      this.sort.direction === 'desc'
        ? <T>(a: T, b: T) => (a === b ? 0 : a < b ? 1 : -1)
        : <T>(a: T, b: T) => (a === b ? 0 : a > b ? 1 : -1);

    const items = (this.data || []).filter(item =>
      item.name.includes(this.keywords || ''),
    );

    if (this.sort.active) {
      this.items = [...items].sort((a, b) =>
        comparator(get(a, this.sort.active), get(b, this.sort.active)),
      );
    } else {
      this.items = items;
    }

    this.cdr.detectChanges();
  }

  sortChange(sort: Sort) {
    this.sort = sort;
    this.setItems();
  }
}
