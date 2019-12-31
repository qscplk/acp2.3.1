interface FormItemValidatorParams {
  maxLength: number;
  pattern: RegExp;
  translateKeyPrefix: string;
}

interface FormItemValidatorRule {
  pattern: RegExp;
  maxLength: number;
  minlength?: number;
  placeholder: string;
  patternError: string;
  placeholderError: string;
  maxLengthError: string;
  requiredError: string;
}

// 应用,存储,保密字典, 流水线，凭据名称，绑定名称，集成名称，工具内新建资源（如nexus创建maven 以及将来可能有的gitlab创建org等）
const RESOURCE_NAME_CASE_BASE_MAPPER = {
  pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
  translateKeyPrefix: 'regexp_resource_name_base',
};

// 配置字典:
const RESOURCE_NAME_CASE_CONFIGMAP_MAPPER = {
  pattern: /^[a-z0-9]([-.a-z0-9]*[a-z0-9])?$/,
  translateKeyPrefix: 'regexp_resource_name_configmap',
};

export const K8S_RESOURCE_NAME_BASE = {
  pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
  tip: 'regexp_tip_k8s_resource_name_base',
};
export const K8S_CONFIGMAP_SECRET_NAME = {
  pattern: /^[a-z0-9][-.a-z0-9]*$/,
  tip: 'regexp_tip_k8s_config_secret_name',
};

export const K8S_ENV_VARIABLE_NAME = {
  pattern: /^[-._a-zA-Z][-._a-zA-Z0-9]*$/,
  tip: 'regexp_tip_k8s_env_variable_name',
};

export const INT_PATTERN = {
  pattern: /^-?\d+$/,
  tip: 'regexp_tip_integer_pattern',
};

export const POSITIVE_INT_PATTERN = {
  pattern: /^[1-9]\d*$/,
  tip: 'regexp_tip_positive_integer_pattern',
};

export const IMAGE_PATH = {
  pattern: /^[a-z0-9]([\/:a-z0-9._-]*[a-z0-9])?$/,
  tip: 'regexp_tip_image_path_rule',
};

export const INT_PATTERN_ZERO = {
  pattern: /^(0|\+?[1-9][0-9]*)$/,
  tip: 'regexp_tip_positive_integer_pattern_zero',
};

export const genrateResourceValidatorRules = ({
  maxLength,
  pattern,
  translateKeyPrefix,
}: Partial<FormItemValidatorParams>): Partial<FormItemValidatorRule> => {
  // todo: temp hack for app name length
  let count: string;
  if (maxLength !== 36 && maxLength !== 63) {
    count = 'n';
  } else {
    count = maxLength.toString();
  }
  return {
    placeholder: `${translateKeyPrefix}_placeholder_${count}`,
    placeholderError: `${translateKeyPrefix}_placeholder_${count}`,
    pattern,
    patternError: `${translateKeyPrefix}_pattern`,
    maxLength,
    maxLengthError: `regexp_char_max_length_${count}`,
    requiredError: 'required',
  };
};

export const PIPELINE_NAME_RULE = genrateResourceValidatorRules({
  maxLength: 36,
  ...RESOURCE_NAME_CASE_BASE_MAPPER,
});

export const SECRETS_NAME_RULE = genrateResourceValidatorRules({
  maxLength: 36,
  ...RESOURCE_NAME_CASE_BASE_MAPPER,
});

export const APPLICATION_NAME_RULE = (maxLength: number = 63) =>
  genrateResourceValidatorRules({
    maxLength,
    ...RESOURCE_NAME_CASE_BASE_MAPPER,
  });

export const CONFIGMAP_NAME_RULE = genrateResourceValidatorRules({
  maxLength: 63,
  ...RESOURCE_NAME_CASE_CONFIGMAP_MAPPER,
});

export const CONFIG_SECRETS_NAME_RULE = genrateResourceValidatorRules({
  maxLength: 63,
  ...RESOURCE_NAME_CASE_BASE_MAPPER,
});

export const STORAGES_NAME_RULE = genrateResourceValidatorRules({
  maxLength: 63,
  ...RESOURCE_NAME_CASE_BASE_MAPPER,
});

export const TOOLCHAIN_BINDING_NAME = genrateResourceValidatorRules({
  maxLength: 36,
  ...RESOURCE_NAME_CASE_BASE_MAPPER,
});
