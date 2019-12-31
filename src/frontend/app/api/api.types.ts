import { SecretType } from './secret/secret-api.types';

export interface K8SResource {
  apiVersion?: string;
  kind?: string;
  metadata?: K8SMetaData;
  objectMeta?: K8SMetaData;
  spec: {
    [key: string]: any;
  };
  status?: {
    phase: string;
    message: string;
  };
}

export interface K8SMetaData {
  name: string;
  namespace?: string;
  description?: string;
  creationTimestamp?: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
}

export interface ResourceService {
  name: string;
  creationTimestamp: string;
  host: string;
  accessUrl: string;
  secretType?: SecretType;
  secretName?: string;
  secretNamespace?: string;
  html?: string;
  status: ResourceStatus;
  __original: K8SResource;
}

export interface ResourceStatus {
  phase: string;
  message: string;
  [key: string]: any;
}

export interface ResourceBinding {
  name: string;
  namespace: string;
  accessUrl?: string;
  creationTimestamp: string;
  description: string;
  service: string;
  serviceType?: string;
  secret: string;
  secretType?: SecretType;
  status: ResourceStatus;
  __original?: K8SResource;
}

export interface BindingParams {
  name: string;
  namespace: string;
  secret: string;
  service: string;
  description: string;
  secretType?: SecretType;
}

export interface ListResult<T> {
  total: number;
  items: Array<T>;
  errors: any[];
}
