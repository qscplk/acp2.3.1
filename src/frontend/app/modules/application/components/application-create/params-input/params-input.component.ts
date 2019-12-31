import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

@Component({
  selector: 'alo-params-input',
  templateUrl: './params-input.component.html',
  styleUrls: ['./params-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCreateParamsInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => AppCreateParamsInputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCreateParamsInputComponent
  implements ControlValueAccessor, Validator {
  params: { value: string }[] = [];
  propagateChange = (_: any) => {};

  constructor(private cdr: ChangeDetectorRef) {}

  get canRemove() {
    return this.params.length > 1;
  }

  trackByFn(_index: number, row: any) {
    return row;
  }

  writeValue(params: string[]): void {
    if (params) {
      params.forEach(param => {
        this.params.push({ value: param });
      });
      this.cdr.detectChanges();
    }
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(): void {}

  validate(): ValidationErrors {
    return null;
  }

  onValueChange() {
    this.propagateChange(
      this.params.map(param => {
        return param.value;
      }),
    );
  }

  add() {
    this.params.push({ value: '' });
  }

  deleteRow(index: number) {
    if (this.canRemove) {
      this.params.splice(index, 1);
    }
  }
}
