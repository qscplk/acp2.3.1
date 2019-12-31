import { Component, Input } from '@angular/core';

@Component({
  selector: 'alo-foldable-block',
  templateUrl: './foldable-block.component.html',
  styleUrls: ['./foldable-block.component.scss'],
})
export class FoldableBlockComponent {
  @Input() title = '';
  folded = true;
}
