import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'alo-resource-labels-field',
  templateUrl: './resource-labels-field.component.html',
  styleUrls: ['./resource-labels-field.component.scss'],
})
export class ResourceLabelsFieldComponent {
  @Input()
  resource: any;
  @Input()
  kind = 'label';
  @Input()
  allowedUpdate = false;
  @Output()
  updated = new EventEmitter();

  showUpdate() {
    if (!this.allowedUpdate) {
      return;
    }
    this.updated.next();
  }
}
