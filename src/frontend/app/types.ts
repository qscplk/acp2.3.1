export interface Pagination<T> {
  items: T[];
  total: number;
  error?: boolean;
}

export interface StringMap {
  [key: string]: string;
}

export interface TypeMeta {
  kind?: string;
  apiVersion?: string;
}

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller: boolean;
  blockOwnerDeletion: boolean;
}

export interface ObjectMeta {
  name?: string;
  namespace?: string;
  labels?: StringMap;
  annotations?: StringMap;
  readonly selfLink?: string;
  readonly uid?: string;
  readonly creationTimestamp?: string;
  readonly ownerReferences?: OwnerReference[];
  resourceVersion?: string;
}

export interface KubernetesResource extends TypeMeta {
  metadata?: ObjectMeta;
  status?: any;
}

export interface ConfigMap extends KubernetesResource {
  data?: StringMap;
}

export interface Secret extends KubernetesResource {
  data?: StringMap;
}

export interface PersistentVolumeClaim extends KubernetesResource {
  spec?: PersistentVolumeClaimSpec;
}

export interface PersistentVolumeClaimSpec {
  accessModes: string[];
  volumeMode: string;
  storageClassName: string;
  resources: { [key: string]: any };
  selector: {
    matchLabels?: StringMap;
  };
}
