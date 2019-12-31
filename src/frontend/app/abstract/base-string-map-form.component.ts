import { Injector, OnInit } from '@angular/core';
import { FormArray, ValidatorFn } from '@angular/forms';
import { BaseResourceFormComponent } from 'ng-resource-form-util';

export type KeyValue = [string, string];

// 用以Form级别的键值映射对象的修改.
// 这个表单有些特别. 内部实现是以FormArray实现, 但对外暴露的是一个key->value对象.
export class BaseStringMapFormComponent
  extends BaseResourceFormComponent<{ [key: string]: string }, KeyValue[]>
  implements OnInit {
  form: FormArray;
  constructor(public injector: Injector) {
    super(injector);
  }

  getResourceMergeStrategy(): boolean {
    return false;
  }

  createForm() {
    return this.fb.array([]);
  }

  getDefaultFormModel(): KeyValue[] {
    return [['', '']];
  }

  adaptResourceModel(resource: { [key: string]: string }) {
    let newFormModel = Object.entries(resource || {});
    if (newFormModel.length === 0) {
      newFormModel = this.getDefaultFormModel();
    }

    return newFormModel;
  }

  adaptFormModel(formModel: KeyValue[]) {
    return formModel
      .filter(row => !!row[0])
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});
  }

  getOnFormArrayResizeFn() {
    return () => this.createNewControl();
  }

  add(index = this.form.length) {
    this.form.insert(index, this.getOnFormArrayResizeFn()());
    this.cdr.markForCheck();
  }

  remove(index: number) {
    this.form.removeAt(index);
    this.cdr.markForCheck();
  }

  private getPreviousKeys(index: number) {
    return this.formModel
      .slice(0, index)
      .map(([key]) => key)
      .filter(key => !!key);
  }

  protected createNewControl() {
    const missingKeyValidator: ValidatorFn = control => {
      const [key, value] = control.value;
      if (value && !key) {
        return { keyIsMissing: true };
      } else {
        return null;
      }
    };

    const duplicateKeyValidator: ValidatorFn = control => {
      const index = this.form.controls.indexOf(control);
      const previousKeys = this.getPreviousKeys(index);

      const [key] = control.value;

      if (previousKeys.includes(key)) {
        return {
          duplicateKey: key,
        };
      } else {
        return null;
      }
    };

    return this.fb.array(
      [[], []],
      [missingKeyValidator, duplicateKeyValidator],
    );
  }
}
