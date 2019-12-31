import { DIALOG_DATA } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

@Component({
  templateUrl: './mode-select.component.html',
  styleUrls: ['./mode-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeSelectComponent {
  namespace: string;
  category: string;

  constructor(@Inject(DIALOG_DATA)
  data: {
    namespace: string;
    category: string;
  }) {
    this.namespace = data.namespace;
    this.category = data.category;
  }
}
