import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  Directive,
  EventEmitter,
  Input,
  Output,
  QueryList,
  TemplateRef,
} from '@angular/core';

export interface ArrayFormTableRowContext {
  allowEdit: boolean;
  allowDelete: boolean;
}

@Directive({
  selector: '[aloArrayFormTableHeader]',
})
export class ArrayFormTableHeaderDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}

@Directive({
  selector: '[aloArrayFormTableRow]',
})
export class ArrayFormTableRowDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}

@Directive({
  selector: '[aloArrayFormTableZeroState]',
})
export class ArrayFormTableZeroStateDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}

@Directive({
  selector: '[aloArrayFormTableRowControl]',
})
export class ArrayFormTableRowControlDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}

@Directive({
  selector: '[aloArrayFormTableFooter]',
})
export class ArrayFormTableFooterDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}

@Component({
  selector: 'alo-array-form-table',
  templateUrl: './template.html',
  // Since rows maybe updated without changing reference, we use Default here:
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ArrayFormTableComponent {
  @ContentChild(ArrayFormTableHeaderDirective, {
    read: TemplateRef,
    static: false,
  })
  headerTemplate: TemplateRef<any>;

  // 用户可以提供多行模版, 但只有第一行有控制按键.
  @ContentChildren(ArrayFormTableRowDirective, { read: TemplateRef })
  rowTemplates: QueryList<TemplateRef<any>>;

  // 表单默认提供删除按键; 假如用户提供模版, 将使用用户的模版.
  @ContentChild(ArrayFormTableRowControlDirective, {
    read: TemplateRef,
    static: false,
  })
  rowControlTemplate: TemplateRef<any>;

  // 表单默认提供添加按键; 假如用户提供模版, 将使用用户的模版.
  @ContentChild(ArrayFormTableFooterDirective, {
    read: TemplateRef,
    static: false,
  })
  footerTemplate: TemplateRef<any>;

  // 表单默认为空数据提供无xxx的模版; 假如用户提供模版, 将使用用户的模版.
  @ContentChild(ArrayFormTableZeroStateDirective, {
    read: TemplateRef,
    static: false,
  })
  zeroStateTemplate: TemplateRef<any>;

  // Data context for rows.
  @Input()
  rows: any[];

  @Input()
  noRowSeparator: boolean;

  // 将使用这个值来渲染无数据提示
  @Input()
  resourceName = '';

  @Output()
  add = new EventEmitter();

  @Output()
  remove = new EventEmitter<number>(); // Returns the index to be removed

  @Input()
  rowBackgroundColorFn = (_row: any, _index: number) => 'transparent';

  trackByFn(index: number) {
    return index;
  }
}
