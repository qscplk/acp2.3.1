import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { BaseResourceFormGroupComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-ssh-auth-editor',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SSHAuthEditorComponent extends BaseResourceFormGroupComponent
  implements OnInit {
  @Input()
  type: string;
  constructor(injector: Injector) {
    super(injector);
  }

  getDefaultFormModel() {
    return {
      'ssh-privatekey': '',
    };
  }

  createForm() {
    return this.fb.group({
      'ssh-privatekey': this.fb.control(''),
    });
  }

  ngOnInit() {
    super.ngOnInit();
  }
}
