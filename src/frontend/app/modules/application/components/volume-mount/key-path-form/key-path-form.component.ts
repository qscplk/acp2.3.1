import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormArray,
  FormBuilder,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { setFormByResource } from '@app/utils/form';
import { isEqual } from 'lodash-es';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { KeyValueInputsComponent } from '../key-path-inputs/inputs.component';

export type KeyValue = [string, string];

@Component({
  selector: 'alo-key-path-form',
  templateUrl: './key-path-form.component.html',
  styleUrls: ['./key-path-form.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KeyPathFromComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => KeyPathFromComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyPathFromComponent
  implements ControlValueAccessor, OnInit, Validator {
  private valueSub: Subscription;

  @ViewChildren(KeyValueInputsComponent)
  kviComponents: QueryList<KeyValueInputsComponent>;

  @Input()
  backgroundColor: string;
  @Input()
  keyText = 'key';
  @Input()
  keyFlex = 1;
  @Input()
  valueText = 'value';
  @Input()
  valueFlex = 1;
  @Input()
  keyOptions: string[];
  @Output()
  blur = new EventEmitter();

  form: FormArray;
  rows: KeyValue[] = [];

  onChange = (_: any) => {};
  onTouched = () => {};

  ngOnInit(): void {
    this.setupForm([]);
  }

  addRow(index: number) {
    this.form.insert(index, this.fb.control(['', '']));

    // Auto focus the new row.
    setTimeout(() => {
      this.kviComponents.toArray()[index].focus();
    });
  }

  deleteRow(index: number) {
    this.form.removeAt(index);
  }

  writeValue(keyVauleArr: any[]): void {
    if (keyVauleArr) {
      let index = 0;
      keyVauleArr.forEach(keyValue => {
        this.form.insert(index, this.fb.control(keyValue));
        index++;
      });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onInputsBlur() {
    this.onTouched();
    this.blur.emit();
  }

  trackByFn(_index: number, row: any) {
    return row;
  }

  /**
   * We skipped the form control, but checks the embedded form instead.
   */
  validate(_c: FormControl): ValidationErrors | null {
    if (this.form && this.form.invalid) {
      return { 'alo-key-path-form': true };
    }

    return null;
  }

  private setupForm(rows: KeyValue[]) {
    // TODO: reuse previous form control?
    if (!this.form) {
      this.form = this.fb.array(rows.map(keyValue => [keyValue]));
    }

    if (this.valueSub) {
      this.valueSub.unsubscribe();
    }

    setFormByResource(this.form, rows, () => this.fb.control(['', '']));

    this.valueSub = this.form.valueChanges
      .pipe(
        map(value => this.getValueFromRows(value)),
        distinctUntilChanged(isEqual),
      )
      .subscribe(value => {
        this.onChange(value);
      });

    this.cdr.markForCheck();
  }

  private getValueFromRows(rows: KeyValue[]) {
    return rows.filter(row => !!row[0]);
  }

  constructor(private cdr: ChangeDetectorRef, private fb: FormBuilder) {}
}
