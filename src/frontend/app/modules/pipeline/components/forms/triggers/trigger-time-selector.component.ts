import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';

@Component({
  selector: 'alo-trigger-time-selector',
  styleUrls: ['./trigger-time-selector.component.scss'],
  templateUrl: './trigger-time-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate(300, style({ opacity: 1 })),
      ]),
      transition(':leave', [animate(0, style({ opacity: 0 }))]),
    ]),
  ],
})
export class TriggerTimeSelectorComponent {
  hours = Array(24)
    .fill('')
    .map((_: string, index: number) => (index < 10 ? `0${index}` : index));
  minutes = Array(60)
    .fill('')
    .map((_: string, index: number) => (index < 10 ? `0${index}` : index));
  selecting = false;
  currentTime = {
    hour: '01',
    minute: '00',
  };
  @Output()
  timeSelected = new EventEmitter<string>();
  @HostListener('body:click', ['$event'])
  onBodyClick(event: Event) {
    if (!this.el.nativeElement.contains(event.target) && this.selecting) {
      this.selecting = false;
      this.timeSelected.emit(
        `${this.currentTime.hour}:${this.currentTime.minute}`,
      );
    }
  }
  constructor(private el: ElementRef) {}

  setHour(hour: string) {
    this.currentTime.hour = hour;
  }

  setMin(min: string) {
    this.currentTime.minute = min;
  }

  timePicker() {
    this.selecting = !this.selecting;
  }
}
