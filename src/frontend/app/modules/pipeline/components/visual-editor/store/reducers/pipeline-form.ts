import {
  CHANGE_PIPELINE_SETTINGS,
  CLEAR_PIPELINE,
  EditActions,
  RESET_PIPELINE,
} from '../actions';
import { FormEntity } from '../models/form';
import { getPipelineFormErrors } from '../utils/datasource';

const values = {
  name: '',
  displayName: '',
  jenkinsBinding: '',
  runPolicy: 'Serial',
  agent: '',
  codeChangeEnabled: false,
  codeChangePeriodicCheck: 'H/2 * * * *',
  cronEnabled: false,
  cronRule: '0 18 * * *',
};

const errors = getPipelineFormErrors(values);

const defaultValue: PipelineFormState & { id: string } = {
  id: 'pipeline',
  values,
  errors,
};

export type PipelineFormState = FormEntity;

export function reducer(
  state: PipelineFormState = defaultValue,
  action: EditActions,
): PipelineFormState {
  switch (action.type) {
    case CLEAR_PIPELINE:
      return defaultValue;
    case RESET_PIPELINE:
      return action.pipelineForm;
    case CHANGE_PIPELINE_SETTINGS:
      return { ...action.form, edited: true };
    default:
      return state;
  }
}
