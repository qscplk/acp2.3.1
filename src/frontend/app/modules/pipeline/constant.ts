import { AbstractControl, FormControl, Validators } from '@angular/forms';
import { CodeRepositoryModel } from '@app/api';
import { PIPELINE_NAME_RULE } from '@app/utils/patterns';
import { extend, get } from 'lodash-es';

const templateModel = {
  template: [null, Validators.required],
};

const basicModel = {
  name: [
    '',
    [
      Validators.required,
      Validators.maxLength(PIPELINE_NAME_RULE.maxLength),
      Validators.pattern(PIPELINE_NAME_RULE.pattern),
    ],
  ],
  display_name: ['', [Validators.maxLength(100)]],
  jenkins_instance: ['', Validators.required],
  app: '',
  source: 'repo',
  run_policy: 'Serial',
};

const jenkinsfileModel = {
  repo: [
    {
      repo: '',
      secret: null,
      bindingRepository: null,
      kind: 'buildin',
    } as CodeRepositoryModel,
    Validators.required,
  ],
  branch: ['master', Validators.required],
  path: ['Jenkinsfile', Validators.required],
};

const scriptModel = {
  script: ['', Validators.required],
};

const codeTriggerModel = {
  enabled: false,
  cron_string: ['', Validators.maxLength(20)],
};

const cronTriggerModel: any = {
  enabled: false,
  cron_string: '',
  cron_object: [{ days: {}, times: [] }, [cronRuleValidator]],
  sourceType: 'select',
};

export const MODEL: any = {
  templateModel,
  basicModel,
  jenkinsfileModel,
  scriptModel,
  codeTriggerModel,
  cronTriggerModel,
};

export function cronRuleValidator(
  control: FormControl,
): null | { [key: string]: any } {
  const value = control.value;
  if (control.validator) {
    const validator = control.validator({} as AbstractControl);
    if (validator && validator.required && value) {
      let err = {};
      const days = Object.keys(value.days).map(k => {
        return value.days[k];
      });
      if (!days.includes(true)) {
        err = { leastOneDay: true };
      }
      if (!value.times.length) {
        err = extend(err, { leastOneTime: true });
      }
      return err;
    } else {
      return null;
    }
  }
  return null;
}

export function imageRequiredValidator(
  control: FormControl,
): null | { [key: string]: any } {
  const value = control.value;
  if (control.validator) {
    const validator = control.validator({} as AbstractControl);
    if (validator && validator.required && value) {
      let err = {};
      const kind = get(value, 'kind', '');
      const bindingRepository = get(value, 'bindingRepository', '');
      const repo = get(value, 'repo', '');
      if (
        (kind === 'buildin' && !bindingRepository) ||
        (kind !== 'buildin' && !repo)
      ) {
        err = { repoRequired: true };
      }
      return err;
    } else {
      return null;
    }
  }
  return null;
}

export const DROPDOWN_TYPES = [
  'alauda.io/project',
  'alauda.io/clustername',
  'alauda.io/namespace',
  'alauda.io/servicenamemix',
  'alauda.io/imagetag',
  'alauda.io/jenkinscredentials',
  'alauda.io/containername',
  'alauda.io/coderepostiory',
  'alauda.io/toolbinding',
  'alauda.io/codebranch',
];

export const MULTI_DROPDOWN_TYPES = ['alauda.io/dependArtifactRegistry'];

export const INPUT_DROPDOWN_TYPES: string[] = ['alauda.io/codebranch'];

export const STYLE_ICONS = [
  'ant',
  'golang',
  'maven',
  'java',
  'kubernetes',
  'python',
  'nodejs',
  'sonarqube',
  'docker',
];
