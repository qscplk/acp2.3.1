export interface StoragesFindParams {
  name?: string;
  pageIndex?: number;
  itemsPerPage?: number;
  cluster: string;
  namespace: string;
  sort: string;
  direction: string;
}

export const PersistentVolumeClaimTypeMeta = {
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
};

export interface StorageDetail {
  appName: string;
  displayName?: string;
  accessModes: string[];
  capacity?: { [key: string]: string };
  objectMeta: {
    annotations?: { [key: string]: string };
    labels?: { [key: string]: string };
    creationTimestamp: string;
    name: string;
    namespace: string;
  };
  status: string;
  storageClass: string;
  typeMeta: {
    kind: string;
  };
  volume?: string;
}

export interface StorageModel {
  apiVersion: string;
  displayName?: string;
  kind: string;
  metadata: {
    namespace: string;
    labels: { [key: string]: string };
    annotations: { [key: string]: string };
  };
  spec: {
    accessModes: string[];
    resources: { requests: { storage: string } };
    storageClassName: string;
  };
}

export interface StorageItem {
  appName: string;
  displayName?: string;
  accessModes: string[];
  capacity?: { [key: string]: string };
  objectMeta: {
    annotations?: { [key: string]: string };
    labels?: { [key: string]: string };
    creationTimestamp: string;
    name: string;
    namespace: string;
  };
  status: string;
  storageClass: string;
  typeMeta: {
    kind: string;
  };
  volume?: string;
}
