import { Component, Input, OnInit, TemplateRef } from '@angular/core';

@Component({
  selector: 'alo-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
})
export class LoadingComponent implements OnInit {
  @Input() aloLoading = false;
  @Input() aloSize = '32';
  @Input() aloIndicator: TemplateRef<void>;

  get size() {
    return '' + this.aloSize;
  }
  constructor() {}

  ngOnInit() {}
}
