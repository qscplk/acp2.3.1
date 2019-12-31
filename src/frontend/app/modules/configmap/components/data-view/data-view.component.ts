import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'alo-configmap-data-viewer',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.scss'],
})
export class ConfigMapDataViwerComponent implements OnInit, OnChanges {
  @Input()
  data: { [key: string]: string };

  pageScroll$: Observable<number>;

  configs: Array<[string, string]> = [];

  constructor() {}

  ngOnInit(): void {
    const layoutPageEl = document.querySelector('.aui-layout__page');
    this.pageScroll$ = fromEvent(layoutPageEl, 'scroll').pipe(
      startWith({}),
      map(() => layoutPageEl.scrollTop),
    );
  }

  ngOnChanges({ data }: SimpleChanges) {
    if (data) {
      this.configs = Object.entries(this.data || {});
    }
  }

  handleTocLink(tocLink: string) {
    return tocLink.replace(/\./g, '_');
  }
}
