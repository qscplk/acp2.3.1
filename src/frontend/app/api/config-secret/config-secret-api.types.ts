export interface ConfigSecretsItem {
  appName: string;
  displayName?: string;
  keys: string[];
  objectMeta: {
    name: string;
    namespace: string;
    creationTimestamp: string;
  };
  typeMeta: {
    kind: string;
  };
}

export interface ConfigSecretsFindParams {
  cluster: string;
  namespace: string;
  name?: string;
  pageIndex?: number;
  itemsPerPage?: number;
  sort?: string;
  direction?: string;
  includePublic?: string;
}

export const ConfigSecretTypeMeta = {
  apiVersion: 'v1',
  kind: 'Secret',
};

export interface ConfigSecretDetail {
  appName: string;
  displayName?: string;
  data: any;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    annotations?: any;
    labels?: any;
  };
  TypeMeta: {
    kind: string;
  };
  type: string;
}
