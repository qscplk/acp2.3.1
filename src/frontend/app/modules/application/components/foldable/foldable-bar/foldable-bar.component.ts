import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'alo-foldable-bar',
  templateUrl: './foldable-bar.component.html',
  styleUrls: ['./foldable-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoldableBarComponent {
  @Input() title: any;
  @Output() toggleFold = new EventEmitter();
  folded = true;

  toggle() {
    this.folded = !this.folded;
    this.toggleFold.emit();
  }
}
