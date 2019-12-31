import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
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
  selector: 'alo-container-update-env-from',
  templateUrl: './container-update-envfrom.component.html',
  styleUrls: ['./container-update-envfrom.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContainerUpdateEnvFromComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ContainerUpdateEnvFromComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdateEnvFromComponent
  implements ControlValueAccessor, Validator {
  @Input()
  namespace: string;
  @Input()
  cluster: string;
  envFrom: any;
  propagateChange = (_: any) => {};

  constructor(private cdr: ChangeDetectorRef) {}

  writeValue(envFrom: any): void {
    this.envFrom = envFrom;
    if (envFrom) {
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

  envFromChange() {
    this.propagateChange(this.envFrom);
  }
}
