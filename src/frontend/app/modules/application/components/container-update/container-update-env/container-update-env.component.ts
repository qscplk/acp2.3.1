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
import { Env } from '@app/api';

const defaultValue = (): Env => ({ name: '', value: '' });

@Component({
  selector: 'alo-container-update-env',
  templateUrl: './container-update-env.component.html',
  styleUrls: ['./container-update-env.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContainerUpdateEnvComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ContainerUpdateEnvComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdateEnvComponent
  implements ControlValueAccessor, Validator {
  @Input()
  namespace: string;

  @Input()
  cluster: string;

  envs: Env[] = [defaultValue()];
  private propagateChange = (_: any) => {};

  constructor(private readonly cdr: ChangeDetectorRef) {}

  writeValue(env: Env[]): void {
    this.envs = env;
    this.cdr.detectChanges();
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(): void {}

  validate(): ValidationErrors {
    return null;
  }

  envChange() {
    this.propagateChange(this.envs);
  }
}
