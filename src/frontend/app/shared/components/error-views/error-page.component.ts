import { Component, Input } from '@angular/core';

@Component({
  selector: 'alo-error-page',
  templateUrl: 'error-page.component.html',
  styleUrls: ['error-page.component.scss'],
})
export class ErrorPageComponent {
  @Input() error: any = null;
}
