import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  QueryList,
  TemplateRef,
} from '@angular/core';

import { BreadcrumbItemDirective } from './breadcrumb-item.directive';

@Component({
  selector: 'alo-breadcrumb',
  templateUrl: 'breadcrumb.component.html',
  styleUrls: ['breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: true,
})
export class BreadcrumbComponent {
  @ContentChildren(BreadcrumbItemDirective, { read: TemplateRef })
  items: QueryList<TemplateRef<any>>;
}
