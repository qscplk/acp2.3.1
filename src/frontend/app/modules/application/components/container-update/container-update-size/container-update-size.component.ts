import { noop } from '@alauda/common-snippet';
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
import { ContainerSize } from '@app/api';
import { get } from 'lodash-es';

@Component({
  selector: 'alo-container-update-size',
  templateUrl: './container-update-size.component.html',
  styleUrls: ['./container-update-size.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContainerUpdateSizeComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ContainerUpdateSizeComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdateSizeComponent
  implements ControlValueAccessor, Validator {
  memUnits = ['Gi', 'Mi'];
  cpuUnits = ['m', 'c'];
  memRequestUnit = 'Mi';
  memRequestValue: number;
  memLimitUnit = 'Mi';
  memLimitValue: number;
  cpuRequestUnit = 'm';
  cpuRequestValue: number;
  cpuLimitUnit = 'm';
  cpuLimitValue: number;
  resources: ContainerSize;
  isDisabled = false;
  propagateChange = (_: any) => {};

  constructor(private readonly cdr: ChangeDetectorRef) {}

  writeValue(resources: ContainerSize): void {
    this.resources = resources;
    if (resources) {
      this.initResource();
      this.cdr.detectChanges();
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched() {
    return noop;
  }

  validate(): ValidationErrors {
    return null;
  }

  inputChange() {
    this.propagateChange(this.resourcesToValue());
  }

  resourcesToValue() {
    const resources: ContainerSize = {
      requests: { cpu: '', memory: '' },
      limits: { cpu: '', memory: '' },
    };
    if (this.memRequestValue) {
      resources.requests.memory = this.memRequestValue + this.memRequestUnit;
    }
    if (this.memLimitValue) {
      resources.limits.memory = this.memLimitValue + this.memLimitUnit;
    }
    if (this.cpuRequestValue) {
      resources.requests.cpu =
        this.cpuRequestValue +
        (this.cpuRequestUnit === 'c' ? '' : this.cpuRequestUnit);
    }
    if (this.cpuLimitValue) {
      resources.limits.cpu =
        this.cpuLimitValue +
        (this.cpuLimitUnit === 'c' ? '' : this.cpuLimitUnit);
    }
    return resources;
  }

  initResource() {
    if (get(this.resources, 'requests.memory')) {
      const { value, unit } = this.handleResourceMemorySize(
        get(this.resources, 'requests.memory'),
      );
      this.memRequestValue = value;
      this.memRequestUnit = unit;
    }
    if (get(this.resources, 'limits.memory')) {
      const { value, unit } = this.handleResourceMemorySize(
        get(this.resources, 'limits.memory'),
      );
      this.memLimitValue = value;
      this.memLimitUnit = unit;
    }
    if (get(this.resources, 'requests.cpu')) {
      const { value, unit } = this.handleResourceCpuSize(
        get(this.resources, 'requests.cpu'),
      );
      this.cpuRequestValue = value;
      this.cpuRequestUnit = unit;
    }
    if (get(this.resources, 'limits.cpu')) {
      const { value, unit } = this.handleResourceCpuSize(
        get(this.resources, 'limits.cpu'),
      );
      this.cpuLimitValue = value;
      this.cpuLimitUnit = unit;
    }
  }

  handleResourceMemorySize(value: string) {
    let resourceValue: number;
    let resourceUnit: string;
    if (value.endsWith('i')) {
      resourceUnit = value.slice(-2);
      resourceValue = parseFloat(value.slice(0, -2));
    } else {
      resourceUnit = value.slice(-1);
      resourceValue = parseFloat(value.slice(0, -1));
    }
    return { value: resourceValue, unit: resourceUnit };
  }

  handleResourceCpuSize(value: string) {
    const resourceUnit = value.endsWith('m') ? 'm' : 'c';
    const resourceValue =
      resourceUnit === 'm' ? parseFloat(value.slice(0, -1)) : parseFloat(value);
    return { value: resourceValue, unit: resourceUnit };
  }
}
