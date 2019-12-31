import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'alo-steps',
  templateUrl: './steps.component.html',
  styleUrls: ['./steps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsComponent {
  @Input() currentIndex: number;
  @Input() stepConfigs: string[];
}
