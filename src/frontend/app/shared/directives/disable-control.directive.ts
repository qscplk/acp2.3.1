import { Directive, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

// https://github.com/angular/angular/blob/f8096d499324cf0961f092944bbaedd05364eea1/packages/forms/src/directives/reactive_errors.ts#L64
@Directive({
  selector: '[aloDisableControl]',
})
export class DisableControlDirective {
  @Input('aloDisableControl')
  set disableControl(condition: boolean) {
    const action = condition ? 'disable' : 'enable';
    this.ngControl.control[action]();
  }
  constructor(private ngControl: NgControl) {}
}
