import { TranslateService } from '@alauda/common-snippet';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class AppPaginatorIntl {
  readonly changes = new Subject<void>();

  get itemsPerPageLabel() {
    return this.translate.get('paginator.page_items');
  }

  constructor(private readonly translate: TranslateService) {
    this.translate.locale$.subscribe(() => this.changes.next());
  }

  getTotalLabel = (length: number) =>
    this.translate.get('paginator.total_records', { length });
}
