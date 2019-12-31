import { Component, Input } from '@angular/core';

@Component({
  selector: 'alo-zero-state',
  templateUrl: './zero-state.component.html',
  styleUrls: ['./zero-state.component.scss'],
})
export class ZeroStateComponent {
  @Input() resourceName: string;
}
