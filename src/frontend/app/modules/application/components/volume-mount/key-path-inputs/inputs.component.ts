import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'alo-key-value-inputs',
  templateUrl: './inputs.component.html',
  styleUrls: ['./inputs.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KeyValueInputsComponent),
      multi: true,
    },
  ],
})
export class KeyValueInputsComponent implements OnInit, ControlValueAccessor {
  private _key = '';
  private _value = '';

  disabled = false;
  @Input() keyPlaceholder = 'key';
  @Input() valuePlaceholder = 'value';
  @Input() keyFlex = 1;
  @Input() valueFlex = 1;
  @Input() keyOptions: string[];

  @Input()
  get key() {
    return this._key;
  }

  set key(key: string) {
    this._key = key;
  }

  @Output() keyChange = new EventEmitter();
  @Output() blur = new EventEmitter();

  @Input()
  get value() {
    return this._value;
  }

  set value(value: string) {
    this._value = value;
  }

  @Output() valueChange = new EventEmitter();

  @Input() readonly: boolean;

  onChange = (_: any) => {};
  onTouched = () => {};

  onBlur() {
    this.onTouched();
    this.blur.emit();
  }

  constructor(private cdr: ChangeDetectorRef, private elementRef: ElementRef) {}

  ngOnInit(): void {}

  onKeyChange(key: string, emitEvent = false) {
    if (emitEvent && this.key !== key) {
      this.keyChange.emit(key);
      this.onChange([key, this.value]);
    }
    this.key = key;
    this.cdr.markForCheck();
  }

  onValueChange(value: string, emitEvent = false) {
    if (emitEvent && this.value !== value) {
      this.valueChange.emit(value);
      this.onChange([this.key, value]);
    }
    this.value = value;
    this.cdr.markForCheck();
  }

  writeValue(keyValue: [string, string]): void {
    keyValue = keyValue || ['', ''];
    this.key = keyValue[0];
    this.value = keyValue[1];
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  focus() {
    this.elementRef.nativeElement.querySelector('input').focus();
  }
}
