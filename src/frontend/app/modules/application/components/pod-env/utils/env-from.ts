import { ConfigMapRef, EnvFromSource, SecretRef } from '@app/api';

export type SupportedEnvFromSourceType = 'configMapRef' | 'secretRef';
export type SupportedEnvFromSourceKind = 'Secret' | 'ConfigMap';

export const KIND_TO_SUPPORTED_ENV_FROM_TYPES: {
  [key: string]: SupportedEnvFromSourceType;
} = {
  Secret: 'secretRef',
  ConfigMap: 'configMapRef',
};

export const ENV_FROM_SOURCE_TYPE_TO_KIND: {
  [key: string]: SupportedEnvFromSourceKind;
} = {
  secretRef: 'Secret',
  configMapRef: 'ConfigMap',
};

export function getEnvFromSourceType(
  envFrom: EnvFromSource,
): SupportedEnvFromSourceType {
  return Object.keys(envFrom).filter(key =>
    Object.keys(ENV_FROM_SOURCE_TYPE_TO_KIND).includes(key),
  )[0] as any;
}

export function getEnvFromSourceKind(
  envFrom: EnvFromSource,
): SupportedEnvFromSourceKind {
  return ENV_FROM_SOURCE_TYPE_TO_KIND[getEnvFromSourceType(envFrom)];
}

export function getEnvFromSource(
  envFrom: EnvFromSource,
): ConfigMapRef | SecretRef {
  const refKey = getEnvFromSourceType(envFrom);
  if (refKey) {
    return envFrom[refKey];
  } else {
    return { name: '' };
  }
}
