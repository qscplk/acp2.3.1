import {
  K8SResource,
  ResourceBinding,
  ResourceService,
  ResourceStatus,
} from '@app/api/api.types';

export interface RegistryService extends ResourceService {
  type: string;
  public: boolean;
}

export interface RegistryBinding extends ResourceBinding {
  repositories: string[];
  kind?: string;
}

export interface ImageRepository {
  name: string;
  namespace: string;
  host: string;
  creationTimestamp: string;
  image: string;
  endpoint: string;
  type: string;
  link: string;
  tags: ImageTag[];
  status: ResourceStatus;
  secretName?: string;
  secretNamespace?: string;
  scanDisabled: boolean;
  __original: K8SResource;
}

export interface ImageTag {
  name: string;
  digest: string;
  createdAt: string;
  size?: string;
  level?: number;
  scanStatus?: ScanStatus;
  message?: string;
  summary?: ScanSummary[];
  author: string;
}

export enum ScanStatus {
  NotScan = 'notScan',
  Pending = 'pending',
  Analyzing = 'analyzing',
  Finished = 'finished',
  Error = 'error',
  Running = 'running',
}

export interface ScanSummary {
  severity: number;
  count: number;
}
