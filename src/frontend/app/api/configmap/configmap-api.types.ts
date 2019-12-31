export interface ConfigMapItem {
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

export interface ConfigMapDetail {
  appName: string;
  displayName?: string;
  data: any;
  objectMeta: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    annotations?: any;
    labels?: any;
  };
  typeMeta: {
    kind: string;
  };
}

export interface ConfigMapFindParams {
  name?: string;
  pageIndex?: number;
  itemsPerPage?: number;
  cluster: string;
  namespace: string;
  sort: string;
  direction: string;
}

export const ConfigMapTypeMeta = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
};
