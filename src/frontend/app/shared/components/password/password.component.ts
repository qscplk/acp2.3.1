import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'alo-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PasswordComponent {
  @Input() value = '';
  show: boolean;

  constructor(private cdr: ChangeDetectorRef) {}

  toggleShow() {
    this.show = !this.show;
    this.cdr.detectChanges();
  }
}
