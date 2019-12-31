import { Validators } from '@angular/forms';
import * as R from 'ramda';

import {
  AllCondition,
  AnyCondition,
  CompiledFieldDefine,
  ControlConfig,
  ControlTypes,
  FieldDefine,
  NameValuePair,
  OptionsResolver,
  RelationDefine,
  ValueSerializor,
} from '../models/form';

export const jsonSerializor = {
  deserialize: (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
  serialize: (value: unknown) => {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },
};

export const stringSerializor = {
  deserialize: (value: string) => value,
  serialize: (value: string) => value,
};

export const booleanSerializor = {
  deserialize: (value: string | boolean | number) => {
    return [1, true, 'true'].includes(value) || value > 1;
  },
  serialize: (value: boolean) => (value ? 'true' : 'false'),
};

export function createControlConfig<T>(
  serializor: ValueSerializor<unknown>,
  isEqual: (a: unknown, b: unknown) => boolean = R.equals,
  optionsResolver: OptionsResolver<T> = null,
) {
  return {
    serializor,
    isEqual,
    optionsResolver,
  };
}

function createStringControlConfig<T>(
  optionsResolver: OptionsResolver<T> = null,
) {
  return createControlConfig(stringSerializor, R.equals, optionsResolver);
}

function createJsonControlConfig<T>(
  optionsResolver: OptionsResolver<T> = null,
) {
  return createControlConfig<T>(jsonSerializor, R.equals, optionsResolver);
}

function createBooleanControlConfig(
  optionsResolver: OptionsResolver<boolean> = null,
) {
  return createControlConfig<boolean>(
    booleanSerializor,
    R.equals,
    optionsResolver,
  );
}

const getConfigCreator = (
  customConfigs: Dictionary<ControlConfig<unknown>>,
) => (field: FieldDefine) => {
  if (customConfigs[field.display.type || field.schema.type]) {
    return customConfigs[field.display.type || field.schema.type];
  }

  if (field.schema.type === 'string') {
    return createStringControlConfig();
  }

  if (field.schema.type === 'boolean') {
    return createBooleanControlConfig();
  }

  return createJsonControlConfig();
};

function getControlType(displayType: string): ControlTypes {
  switch (displayType) {
    case 'boolean':
      return ControlTypes.Switch;
    case 'stringMultiline':
      return ControlTypes.Textarea;
    case 'alauda.io/coderepositorymix':
      return ControlTypes.CodeRepositoryMix;
    case 'alauda.io/dockerimagerepositorymix':
      return ControlTypes.DockerImageRepositoryMix;
    case 'alauda.io/dockerimagerepositorypullmix':
      return ControlTypes.DockerImageRepositoryPullMix;
    case 'alauda.io/project':
    case 'alauda.io/clustername':
    case 'alauda.io/namespace':
    case 'alauda.io/servicenamemix':
    case 'alauda.io/imagetag':
    case 'alauda.io/jenkinscredentials':
    case 'alauda.io/containername':
    case 'alauda.io/coderepostiory':
    case 'alauda.io/toolbinding':
      return ControlTypes.Dropdown;
    case 'alauda.io/dependArtifactRegistry':
      return ControlTypes.MultiDropdown;
    case 'alauda.io/codebranch':
      return ControlTypes.DropdownInput;
    case 'code':
      return ControlTypes.Code;
    default:
      return ControlTypes.Input;
  }
}

function getValidators(validation: Dictionary<unknown>) {
  return Object.keys(validation).reduce((accum, key) => {
    const value = validation[key];
    switch (key) {
      case 'pattern':
        return [...accum, Validators.pattern(value as string)];
      case 'maxLength':
        return [...accum, Validators.maxLength(value as number)];
      default:
        return accum;
    }
  }, []);
}

const compileRelations = (
  relations: RelationDefine[],
  getConfig: (fieldName: string) => ControlConfig<unknown>,
) => {
  const availableRelation = (relations || []).find(item =>
    ['show', 'hidden'].includes(item.action),
  );

  if (!availableRelation) {
    return () => false;
  }
  if (availableRelation.action === 'show') {
    return (values: Dictionary<unknown>) =>
      // eslint-disable-next-line no-useless-call
      !whenExpression(availableRelation.when, getConfig).call(null, values);
  }

  return whenExpression(availableRelation.when, getConfig);
};

function whenExpression(
  when: NameValuePair<unknown> | AllCondition | AnyCondition,
  getConfig: (fieldName: string) => ControlConfig<unknown>,
): (values: Dictionary<unknown>) => boolean {
  if (!when) {
    return () => false;
  }

  if (R.has('name', when)) {
    return (values: Dictionary<unknown>) =>
      whenEqual(when as NameValuePair<unknown>, values, getConfig);
  }
  if (R.has('all', when)) {
    const { all } = when as AllCondition;

    return (values: Dictionary<unknown>) =>
      (all || []).every(item => whenEqual(item, values, getConfig));
  }
  if (R.has('any', when)) {
    // tslint:disable-next-line:variable-name
    const { any } = when as AnyCondition;

    return (values: Dictionary<unknown>) =>
      (any || []).some(item => whenEqual(item, values, getConfig));
  }
}

function whenEqual(
  when: NameValuePair<unknown>,
  values: Dictionary<unknown>,
  getConfig: (fieldName: string) => ControlConfig<unknown>,
): boolean {
  const { name, value } = when;
  const config = getConfig(name);
  const deserializedValue = config.serializor.deserialize(R.toString(value));

  return config.isEqual(deserializedValue, values[name]);
}

function appendAffected(
  accum: Dictionary<CompiledFieldDefine>,
  name: string,
  affected: string,
) {
  if (!name) {
    return accum;
  }

  const existed = accum[name] || { affectFields: [] as string[] };

  return R.assoc(
    name,
    { ...existed, affectFields: [...(existed.affectFields || []), affected] },
    accum,
  );
}

export function compileFieldDefines(
  fieldDefines: FieldDefine[],
  customConfigs: Dictionary<ControlConfig<unknown>>,
): Dictionary<CompiledFieldDefine> {
  const getFieldConfig = getConfigCreator(customConfigs);
  const normalizedFieldDefine: Dictionary<FieldDefine> = fieldDefines.reduce(
    (accum, field) => R.assoc(field.name, field, accum),
    {},
  );
  const getConfigByFieldName = R.pipe(
    (name: string) => normalizedFieldDefine[name],
    getFieldConfig,
  );

  const compiled = R.reduce(
    (accum: Dictionary<CompiledFieldDefine>, fieldDefine: FieldDefine) => {
      const controlType = getControlType(
        fieldDefine.display.type || fieldDefine.schema.type,
      );
      const controlConfig = getFieldConfig(fieldDefine);
      const defaultValue = controlConfig.serializor.deserialize(
        fieldDefine.default,
      );
      const validators = getValidators(fieldDefine.validation || {});
      const hidden = compileRelations(
        fieldDefine.relation,
        getConfigByFieldName,
      );

      return {
        ...appendAffected(accum, fieldDefine.display.related, fieldDefine.name),
        [fieldDefine.name]: {
          ...accum[fieldDefine.name],
          ...R.omit(
            ['schema', 'validation', 'display', 'relation'],
            fieldDefine,
          ),
          controlType,
          controlConfig,
          defaultValue,
          validators,
          hidden,
          displayName: fieldDefine.display.name,
          description: fieldDefine.display.description,
          advanced: fieldDefine.display.advanced,
          args: fieldDefine.display.args,
          related: fieldDefine.display.related,
        },
      };
    },
    {},
    fieldDefines,
  );

  return R.pickBy(
    (fieldDefine: CompiledFieldDefine) => !!fieldDefine.name,
    compiled,
  );
}
