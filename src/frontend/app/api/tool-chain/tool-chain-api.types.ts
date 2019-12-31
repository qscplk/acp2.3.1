import {
  K8SResource,
  ResourceBinding,
  ResourceService,
  ResourceStatus,
} from '@app/api/api.types';
import { BindingKind, ToolKind } from '@app/api/tool-chain/utils';

import { SecretType } from './../secret/secret-api.types';

export interface ToolType {
  name: string;
  displayName: { [key: string]: string };
  enabled: boolean;
  items: Tool[];
}

export interface ToolSupportedType {
  type: string;
  secretType?: string;
  description: { zh: string; en: string };
}

export interface Tool {
  name: string;
  displayName: { [key: string]: string };
  toolType: string;
  shallow?: boolean;
  kind: ToolKind;
  type: string;
  host: string;
  html: string;
  public: boolean;
  enterprise: boolean;
  enabled: boolean;
  supportedSecretTypes?: ToolSupportedType[];
  recommendedVersion?: string;
  description?: { [key: string]: string };
}

export interface ToolService extends ResourceService {
  toolType: string;
  shallow?: boolean;
  kind: ToolKind;
  type: string;
  public: boolean;
  enterprise: boolean;
  ownerReferences?: Array<Dictionary<string>>;
  [key: string]: any;
}

export interface ArtifactRegistryManagerService extends ToolService {
  registries?: ToolService[];
}

export interface ArtifactRegistryService extends ToolService {
  versionPolicy: string;
  blobStore: string;
  artifactType: string;
  artifactRegistryManager: string;
}
export interface ToolIntegrateParams {
  name: string;
  host: string;
  accessUrl: string;
  secretName?: string;
  secretNamespace?: string;
  secretType?: SecretType;
  type?: string;
  public?: boolean;
}

export interface ArtifactRegistryParams {
  name?: string;
  secretType?: SecretType;
  secretName?: string;
  integrateName?: string;
  secretNamespace?: string;
  artifactType: string;
  versionPolicy: string;
  fileLocation: string;
  selectName?: string;
}

export interface ToolBinding extends ResourceBinding {
  kind: BindingKind;
  tool: {
    toolType: string;
    type: string;
    kind: ToolKind;
    public: boolean;
    enterprise: boolean;
  };
}

export interface ArtifactRegistryBinding {
  name: string;
  namespace: string;
  creationTimestamp: string;
  description: string;
  artifactRegistryName: string;
  secretName?: string;
  secretNamespace?: string;
  secretType?: SecretType;
  status: ResourceStatus;
  __original?: K8SResource;
}

export interface AuthorizeInfo {
  authorizeUrl: string;
  redirectUrl: string;
  kind: string;
  apiVersion: string;
  gotAccessToken: boolean;
}
