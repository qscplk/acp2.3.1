import { MenuComponent } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'alo-menu-trigger',
  templateUrl: './menu-trigger.component.html',
  styleUrls: ['./menu-trigger.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuTriggerComponent {
  @Input() menu: MenuComponent;
  @Input() context: { [key: string]: any };
}
