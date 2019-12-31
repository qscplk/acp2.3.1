import { globalNamespace, baseDomain } from '@alauda/common-snippet';

export interface Environments {
  ALAUDA_AUDIT_TTL?: string;
  SYNC_TKE?: string;
  LOGO_URL?: string;
  GLOBAL_NAMESPACE?: string;
  LABEL_BASE_DOMAIN?: string;
}

let environments: Environments = {
  GLOBAL_NAMESPACE: globalNamespace,
  LABEL_BASE_DOMAIN: baseDomain,
};

export const getEnvironments = () => environments;
export const setEnvironments = (envs: Environments) => {
  environments = Object.assign({}, environments, envs);
};
