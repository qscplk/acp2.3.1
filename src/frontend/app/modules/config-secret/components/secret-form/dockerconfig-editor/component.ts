import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { BaseResourceFormGroupComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-dockerconfig-editor',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockerconfigEditorComponent extends BaseResourceFormGroupComponent
  implements OnInit {
  @Input()
  type: string;

  constructor(public injector: Injector) {
    super(injector);
  }

  getDefaultFormModel() {
    return {};
  }

  createForm() {
    return this.fb.group({
      dockerServiceAddress: this.fb.control(''),
      username: this.fb.control(''),
      password: this.fb.control(''),
      email: this.fb.control(''),
    });
  }

  ngOnInit() {
    super.ngOnInit();
  }

  adaptResourceModel(resource: any) {
    // TODO: 因Input在这个之后运行的angular bug 暂时这样处理
    if (!resource) {
      return resource;
    }
    const type = Object.keys(resource)[0];
    if (type && resource[type]) {
      const auths = JSON.parse(resource[type]).auths;
      const dockerServiceAddress = Object.keys(auths)[0];
      const data = auths[dockerServiceAddress];
      resource = {
        dockerServiceAddress,
        username: data.username,
        password: data.password,
        email: data.email,
      };
      return resource;
    }
    return resource;
  }

  adaptFormModel(form: { [key: string]: string }) {
    const data = {
      auths: {
        [form.dockerServiceAddress]: {
          username: form.username,
          password: form.password,
          email: form.email,
        },
      },
    };
    return { [this.type]: JSON.stringify(data) };
  }
}
