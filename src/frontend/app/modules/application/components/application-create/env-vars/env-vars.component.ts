import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface EnvVarPair {
  name: string;
  value: string;
}
const defaultValue = (): EnvVarPair => ({ name: '', value: '' });

@Component({
  selector: 'alo-env-vars',
  templateUrl: 'env-vars.component.html',
  styleUrls: ['env-vars.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EnvVarsComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvVarsComponent implements ControlValueAccessor {
  pairs: EnvVarPair[] = [defaultValue()];
  isDisabled = false;

  private propagateChange = (_: any) => {};

  constructor(private cdr: ChangeDetectorRef) {}

  writeValue(obj: EnvVarPair[]): void {
    this.pairs = obj && obj.length ? obj : [{ name: '', value: '' }];
    this.cdr.detectChanges();
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(): void {}

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.cdr.detectChanges();
  }

  add() {
    this.pairs.push(defaultValue());
  }

  remove(index: number) {
    this.pairs.splice(index, 1);
    this.cdr.detectChanges();
    this.propagateChange(pairsToValue(this.pairs));
  }

  inputChange() {
    this.cdr.detectChanges();
    this.propagateChange(pairsToValue(this.pairs));
  }
}

function pairsToValue(pairs: EnvVarPair[]) {
  const result = pairs.filter(pair => pair.name !== '' && pair.value !== '');

  return result.length ? result : null;
}
