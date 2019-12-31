import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CODE_CHECK_OPTIONS } from '@app/modules/pipeline/utils';

@Component({
  selector: 'alo-pipeline-code-change-trigger-form',
  templateUrl: './code-change-trigger-form.component.html',
  styleUrls: ['./code-change-trigger-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineCodeChangeTriggerFormComponent {
  codeCheckOptions = CODE_CHECK_OPTIONS;

  @Input()
  form: FormGroup;

  formValue(name: string) {
    return !!this.form.get(name).value;
  }
}
