import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { BaseResourceFormGroupComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-basic-auth-editor',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicAuthEditorComponent extends BaseResourceFormGroupComponent
  implements OnInit {
  @Input()
  type: string;
  constructor(injector: Injector) {
    super(injector);
  }

  getDefaultFormModel() {
    return {
      username: '',
      password: '',
    };
  }

  createForm() {
    return this.fb.group({
      username: this.fb.control(''),
      password: this.fb.control(''),
    });
  }

  ngOnInit() {
    super.ngOnInit();
  }
}
