import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { viewActions } from '@app/utils/code-editor-config';

@Component({
  selector: 'alo-pipeline-script-form',
  templateUrl: './script-form.component.html',
  styleUrls: ['./script-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineScriptFormComponent {
  exampleConfigs = { language: 'Jenkinsfile', readOnly: true };
  exampleActionsConfig = viewActions;
  options = {
    language: 'Jenkinsfile',
    recover: false,
    diffMode: false,
  };
  originalYaml = `
  pipeline{
    agent any
     stages{
        stage("Clone"){
           steps{
             git url:"https://github.com/example/example.git"
           }
        }
     }
  }
  `;

  @Input() form: FormGroup;

  @ViewChild('example', { static: true }) example: TemplateRef<any>;
  constructor(private dialog: DialogService) {}

  viewExample() {
    this.dialog.open(this.example, { size: DialogSize.Large });
  }

  hideCreateMethodDialog() {
    this.closeAll();
  }

  closeAll() {
    this.dialog.closeAll();
  }
}
