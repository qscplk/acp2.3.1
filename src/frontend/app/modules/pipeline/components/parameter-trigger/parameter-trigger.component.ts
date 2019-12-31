import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  TriggerPipelineParameter,
  TriggerPipelineParametersModel,
} from '@app/api';

@Component({
  selector: 'alo-pipeline-parameter-trigger',
  templateUrl: './parameter-trigger.component.html',
  styleUrls: ['./parameter-trigger.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineParameterTriggerComponent {
  parameters: TriggerPipelineParameter[];
  model: any = {};
  constructor(
    private dialogRef: DialogRef<PipelineParameterTriggerComponent>,
    @Inject(DIALOG_DATA) private data: any,
  ) {
    this.parameters = this.data.parameters;
  }

  onTriggered(value: TriggerPipelineParametersModel) {
    this.dialogRef.close({ params: value.parameters });
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
