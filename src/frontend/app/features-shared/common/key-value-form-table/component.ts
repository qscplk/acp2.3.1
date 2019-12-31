import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
} from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';
import { BaseStringMapFormComponent } from '@app/abstract';

@Component({
  selector: 'alo-key-value-form-table',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyValueFormTableComponent extends BaseStringMapFormComponent
  implements OnInit {
  form: FormArray;
  constructor(public injector: Injector) {
    super(injector);
  }

  rowBackgroundColorFn(row: FormControl) {
    if (row.invalid) {
      return '#f9f2f4';
    } else {
      return '';
    }
  }
}
