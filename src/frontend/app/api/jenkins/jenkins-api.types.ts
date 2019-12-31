import { ResourceBinding, ResourceService } from '@app/api/api.types';

export type JenkinsService = ResourceService;

export interface JenkinsBinding extends ResourceBinding {
  host: string;
}

export interface JenkinsResource {
  name: string;
  namespace: string;
  kind: 'pipelineconfig';
}

export interface JenkinsAgentLabel {
  matched?: string[];
  others?: string[];
  labels?: string[];
}
