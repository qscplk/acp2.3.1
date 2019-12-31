import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'alo-tag-icon',
  templateUrl: 'tag-icon.component.html',
  styleUrls: ['tag-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagIconComponent {
  @Input() type: string;
  @Input() size: 'small' | 'large' = 'small';

  getClass() {
    return `alo-tag-icon alo-tag-icon--${
      this.size
    } alo-tag-icon--${this.type.toLowerCase()}`;
  }
}
