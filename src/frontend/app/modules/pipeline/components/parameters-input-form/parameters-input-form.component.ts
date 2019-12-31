import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  TriggerPipelineParameter,
  TriggerPipelineParametersModel,
} from '@app/api';
import { isEqual } from 'lodash-es';
@Component({
  selector: 'alo-pipeline-parameters-input-form',
  templateUrl: './parameters-input-form.component.html',
  styleUrls: ['./parameters-input-form.component.scss'],
  exportAs: 'alo-pipeline-parameters-input-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineParametersInputFormComponent implements OnChanges {
  inputTypes = ['string', 'StringParameterDefinition'];
  booleanTypes = ['boolean', 'BooleanParameterDefinition'];
  model: any = {};

  @Input()
  id = '';

  @Input()
  parameters: TriggerPipelineParameter[] = [];

  @Output()
  saved = new EventEmitter<TriggerPipelineParametersModel>();

  @ViewChild('form', { static: true })
  form: NgForm;

  ngOnChanges({ parameters }: SimpleChanges) {
    if (!isEqual(parameters.currentValue, parameters.previousValue)) {
      this.parameters.forEach((p: TriggerPipelineParameter) => {
        const val = this.getDefaultValue(p);
        this.model[p.name] = this.booleanTypes.includes(p.type)
          ? JSON.parse(val)
          : val;
      });
    }
  }

  save(approve = false) {
    this.saved.emit({
      parameters: this.mergedValue(),
      approve: approve,
      inputID: this.id,
    });
  }

  submit(approve = false) {
    (this.form as any).submitted = true;
    this.form.ngSubmit.emit(approve);
  }

  getDefaultValue(param: TriggerPipelineParameter) {
    return param.defaultParameterValue
      ? param.defaultParameterValue.value || ''
      : param.value || '';
  }

  private mergedValue() {
    return this.parameters.map((p: TriggerPipelineParameter) => {
      const value = (this.model[p.name] || '').toString();

      return {
        name: p.name,
        type: p.type,
        value,
      };
    });
  }
}
