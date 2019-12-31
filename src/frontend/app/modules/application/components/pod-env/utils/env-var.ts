import { ConfigMapKeyRef, EnvVar, EnvVarSource, SecretKeyRef } from '@app/api';

export type SupportedEnvVarSourceType = 'configMapKeyRef' | 'secretKeyRef';
export type SupportedEnvVarSourceKind = 'Secret' | 'ConfigMap';

export const SUPPORTED_ENV_SOURCE_KEY_TYPES = [
  'configMapKeyRef',
  'secretKeyRef',
];

export const KIND_TO_ENV_VAR_SOURCE_TYPE: {
  [key: string]: SupportedEnvVarSourceType;
} = {
  Secret: 'secretKeyRef',
  ConfigMap: 'configMapKeyRef',
};

export const ENV_VAR_SOURCE_TYPE_TO_KIND: {
  [key: string]: SupportedEnvVarSourceKind;
} = {
  secretKeyRef: 'Secret',
  configMapKeyRef: 'ConfigMap',
};

export function isEnvVarSourceMode(envVar: EnvVar) {
  return !!envVar && !!envVar.valueFrom;
}

export function isEnvVarSourceSupported(envVar: EnvVar) {
  if (isEnvVarSourceMode(envVar)) {
    if (getEnvVarSourceType(envVar.valueFrom)) {
      return SUPPORTED_ENV_SOURCE_KEY_TYPES.includes(
        getEnvVarSourceType(envVar.valueFrom),
      );
    } else {
      return true;
    }
  } else {
    return false;
  }
}

export function getEnvVarSourceType(
  envVarSource: EnvVarSource,
): SupportedEnvVarSourceType {
  return Object.keys(envVarSource)[0] as SupportedEnvVarSourceType;
}

export function getEnvVarSourceKind(
  envVarSource: EnvVarSource,
): SupportedEnvVarSourceKind {
  return ENV_VAR_SOURCE_TYPE_TO_KIND[getEnvVarSourceType(envVarSource)];
}

export function getEnvVarSource(
  envVar: EnvVar,
): ConfigMapKeyRef | SecretKeyRef {
  return (
    envVar.valueFrom && envVar.valueFrom[getEnvVarSourceType(envVar.valueFrom)]
  );
}
