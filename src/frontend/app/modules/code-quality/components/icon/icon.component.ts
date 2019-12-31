import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export enum CodeQualityIconType {
  Level = 'level',
  Size = 'size',
  Duplicate = 'duplicate',
  Coverage = 'coverage',
}

@Component({
  selector: 'alo-code-quality-icon',
  templateUrl: 'icon.component.html',
  styleUrls: ['icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityIconComponent {
  @Input()
  small = false;

  @Input()
  type = CodeQualityIconType.Level;

  @Input()
  level: 'a' | 'b' | 'c' | 'd' | 'e' = 'e';

  iconTypes = CodeQualityIconType;
}
