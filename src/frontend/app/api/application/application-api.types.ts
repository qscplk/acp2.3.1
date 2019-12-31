import { PipelineConfig } from '@app/api';
export const K8sResourceMap = ['deployments', 'statefulsets', 'daemonsets'];

export type K8sResourceKind = 'deployments' | 'statefulsets' | 'daemonsets';

export interface ApplicationIdentity {
  name?: string;
  namespace: string;
  kind?: string;
  resourceName?: string;
  cluster?: string;
  project?: string;
}

export interface ResourceIdentity {
  resourceName: string;
  applicationName?: string;
  namespace: string;
  cluster?: string;
}

export interface Application {
  name: string;
  displayName?: string;
  namespace: string;
  deployments?: AppK8sResource[];
  statefulsets?: AppK8sResource[];
  daemonsets?: AppK8sResource[];
  pipelines: PipelineConfig[];
  others: OtherResource[];
  visitAddresses?: {
    external: string[];
    internal: string[];
  };
  appStatus?: {
    failed: number;
    pending: number;
    running: number;
    total: number;
  };
}

export interface AppK8sResource {
  name: string;
  namespace: string;
  podInfo: PodInfo;
  containers: Container[];
  kind?: string;
  annotations: {
    [name: string]: string;
  };
  labels: {
    [name: string]: string;
  };
  secrets?: string[];
  clusterAccess?: ClusterAccess[];
  injectSidecar?: string;
  publicNetworkAccess?: PublicNetworkAccess[];
  publicIPAccess?: PublicIPAccess[];
  volumeInfos?: VolumeInfo[];
}

export interface Container {
  name: string;
  image: string;
  env?: Env[];
  envFrom?: any[];
  resources?: any;
  secret?: string;
  args?: string[];
  command?: string;
  volumeMounts?: any;
  isEdit?: boolean;
}

export interface Env {
  name: string;
  value: string;
}

export interface Pod {
  name: string;
  containers: string[];
}

export interface OtherResource {
  name: string;
  namespace: string;
  kind: string;
}

export interface Report {
  name: string;
  type: string;
  operation: string;
  error: any;
}

export interface ApplicationsFindParams {
  name?: string;
  pageIndex?: number;
  itemsPerPage?: number;
  cluster?: string;
  namespace?: string;
  project: string;
}

export interface ApplicationsResponse {
  listMeta: {
    totalItems: number;
  };
  applications: ApplicationResponse[];
  errors: any[];
}

export interface ApplicationResponse {
  daemonsets?: K8sResource[];
  deployments?: K8sResource[];
  statefulsets?: K8sResource[];
  objectMeta: {
    name: string;
    creationTimestamp: string;
  };
}

export interface K8sResource {
  containerImages?: string[];
  initContainerImages?: string[];
  objectMeta: {
    annotations: any;
    creationTimestamp: string;
    labels: any;
    name: string;
    namespace: string;
  };
  podInfo?: PodInfo;
  status?: string;
  typeMeta?: {
    kind?: string;
  };
  visitAddresses?: string[];
}

export interface ApplicationInfo {
  name: string;
  displayName?: string;
  creationTimestamp: string;
  resourceList: K8sResource[];
  visitAddresses: {
    external: string[];
    internal: string[];
  };
  appStatus: {
    failed: number;
    pending: number;
    running: number;
    total: number;
  };
}

export interface ApplicationLogParams {
  application: Application;
  cluster: string;
  resourceName?: string;
  containerName?: string;
  kind?: string;
}

export interface ResourceLogParams {
  namespace: string;
  cluster: string;
  pods: {
    name: string;
    status: string;
  }[];
  containers: Container[];
  selectedContainerName?: string;
}

export interface StringMap {
  [key: string]: string;
}

export interface DetailParams {
  apiVersion?: string;
  kind: string;
  cluster?: string;
  namespace?: string;
  name: string;
}

export interface K8sResourceDetail {
  containers: Container[];
  data: any;
  errors: any;
  objectMeta: {
    annotations: any;
    creationTimestamp: string;
    labels: any;
    name: string;
    namespace: string;
  };
  podInfo?: PodInfo;
  status: string;
  typeMeta: {
    kind: string;
  };
  updateStrategy?: any;
  visitAddresses?: VisitAddresses;
  volumeInfos?: any;
  networkInfo?: {
    externalNetworkInfos: PublicNetworkAccess[];
    internalNetworkInfos: ClusterAccess[];
    externalNodePortInfos: PublicIPAccess[];
  };
  imagePullSecrets?: { name: string }[];
  horizontalPodAutoscalerList?: any[];
}

export interface ContainerParams {
  name?: string;
  kind?: string;
  cluster?: string;
  namespace: string;
  podInfo?: any;
}

export interface PodInfo {
  current: number;
  desired: number;
  pods: Array<{
    name: string;
    status: string;
    warnings: any[];
  }>;
  warnings: any[];
}

export interface ContainerSize {
  requests?: {
    cpu?: string;
    memory?: string;
  };
  limits?: {
    cpu?: string;
    memory?: string;
  };
}

export interface VolumeInfo {
  hostPath?: string;
  name?: string;
  resourceName: string;
  type: string;
  volumeMountInfos?: {
    mountPath: string;
    subPath: string;
  }[];
}

export interface EnvVarSource {
  configMapKeyRef?: ConfigMapKeyRef;
  secretKeyRef?: SecretKeyRef;
}

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: EnvVarSource;
}

export interface EnvFromSource {
  prefix?: string;
  configMapRef?: ConfigMapRef;
  secretRef?: SecretRef;
}

export interface LocalObjectReference {
  name: string;
}

export interface ConfigMapKeyRef extends LocalObjectReference {
  key: string;
  optional?: boolean;
}

export interface SecretKeyRef extends LocalObjectReference {
  key: string;
  optional?: boolean;
}

export interface ConfigMapRef extends LocalObjectReference {
  optional?: boolean;
}

export interface SecretRef extends LocalObjectReference {
  optional?: boolean;
}

export interface ObjectMeta {
  name: string;
  namespace?: string;
  labels?: StringMap;
  annotations?: StringMap;
  creationTimestamp?: string;
  uid?: string;
}

export interface TypeMeta {
  kind: string;
  apiVersion: string;
}

export interface Resource {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
}

export interface ListMeta {
  totalItems: number;
}

export interface AppConfigMap extends Resource {
  keys: string[];
}

export interface AppSecret extends Resource {
  type: string;
  keys: string[];
}

export interface ResourceList {
  listMeta: ListMeta;
  errors?: any;
}

export interface ClusterAccess {
  serviceName: string;
  protocol: string;
  sourcePort?: number;
  targetPort?: number;
}

export interface PublicNetworkAccess {
  domainPrefix?: string;
  domainName: string;
  sourcePort?: number;
  path: string;
  targetPort?: number;
  host?: string;
}

export interface PublicIPAccess {
  protocol: string;
  nodePort?: number;
  sourcePort?: number;
}

export interface ComponentModel {
  injectSidecar?: boolean;
  componentName: string;
  replicas: number;
  type: string;
  labels: any;
  secrets: string[];
  clusterAccess: ClusterAccess[];
  publicNetworkAccess: PublicNetworkAccess[];
  publicIPAccess: PublicIPAccess[];
  containers: Container[];
  isNewComponent?: boolean;
}

export interface VisitAddresses {
  external: string[];
  internal: string[];
  nodeport: string[];
}
