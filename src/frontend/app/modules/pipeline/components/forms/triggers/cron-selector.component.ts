import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

/**
 * model = {
 *   days: {
 *      mon: true,
 *      tue: false,
 *      web: true,
 *   },
 *   time: ['8:00', '9:00'],
 * }
 */
@Component({
  selector: 'alo-cron-trigger-selector',
  templateUrl: './cron-selector.component.html',
  styleUrls: ['./cron-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PipelineCronTriggerSelectorComponent),
      multi: true,
    },
    PipelineCronTriggerSelectorComponent,
  ],
})
export class PipelineCronTriggerSelectorComponent
  implements ControlValueAccessor {
  model: any = {
    times: [],
    days: {
      mon: false,
      tue: false,
      wed: false,
      thu: false,
      fri: false,
      sat: false,
      sun: false,
    },
  };

  @Input()
  errors: { leastOneDay: boolean; leastOneTime: boolean };

  @Input()
  control: FormControl;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  timeSelected(time: string) {
    if (time && !this.model.times.includes(time)) {
      this.model.times.push(time);
      this.valueChanged(this.model);
    }
  }

  deleteTime(index: number) {
    this.model.times.splice(index, 1);
    this.cdr.detectChanges();
    this.valueChanged(this.model);
  }

  dayChange() {
    this.valueChanged(this.model);
  }

  valueChanged = (_: any) => {};
  onTouched = (_: any) => {};
  writeValue(value: any) {
    if (!value || typeof value === 'string') {
      return;
    }
    this.model = value;
    this.cdr.detectChanges();
  }

  registerOnChange(fn: any) {
    this.valueChanged = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  trackFn(_: number, value: string) {
    return value;
  }
}
