import { BindingParams, ResourceBinding, ResourceService } from '../api.types';
import { SecretType } from '../secret/secret-api.types';

export interface CodeRepoServiceType {
  type: string;
  name: string;
  public: boolean;
  displayName: {
    en: string;
    zh: string;
  };
  host: string;
  html?: string;
}

export interface CodeRepoServiceResponse {
  objectMeta?: {
    name: string;
    creationTimestamp: string;
  };
  typeMeta?: {
    kind: string;
  };
  metadata?: {
    name: string;
    creationTimestamp?: string;
  };
  spec: {
    http: {
      host: string;
      html?: string;
    };
    type: string;
    public: boolean;
  };
  status?: {
    phase: string;
    message: string;
  };
}

export interface CodeService extends ResourceService {
  type: string;
  public: boolean;
  createAppUrl: string;
}

export interface CodeRepoOwner {
  type: 'User' | 'Org';
  name: string;
  all: boolean;
  repositories: string[];
}

export interface CodeBindingStatus {
  http: {
    delay: number;
    lastAttempt: string;
    statusCode: number;
  };
  lastUpdated: any;
  phase: string;
  message: string;
}

export interface CodeBinding extends ResourceBinding {
  servicePublic: boolean;
  owners: CodeRepoOwner[];
}

export interface CodeBindingParams extends BindingParams {
  secretType: SecretType;
}

export interface CodeRepository {
  namespace: string;
  name: string;
  httpURL: string;
  cloneURL: string;
  sshURL: string;
  size: number;
  sizeHumanize: string;
  commit: string;
  commitID: string;
  type: string;
  fullName: string;
  ownerName: string;
  secret: { namespace?: string; name: string };
  status: {
    phase: string;
    message: string;
  };
}

export interface CodeRepositoriesFindParams {
  name?: string;
  pageIndex?: number;
  itemsPerPage?: number;
  project: string;
}

export interface CodeRepoServicesResponse {
  listMeta: {
    totalItems: number;
  };
  codereposervices: CodeRepoServiceResponse[];
}

export interface CodeRepoRelatedResource {
  name: string;
  namespace: string;
  kind: string;
}

export interface CodeRepoRelatedResourcesResponse {
  items: CodeRepoRelatedResource[];
}

export interface RemoteRepository {
  codeRepoServiceType: string;
  id: string;
  name: string;
  fullName: string;
  description: string;
  htmlURL: string;
  cloneURL: string;
  sshURL: string;
  language: string;
  lastCommitID: string;
  lastCommitTime: string;
  createdAt: Date;
  pushAt: Date;
  updatedAt: Date;
  private: boolean;
  size: number;
  data?: any;
}

export interface RemoteRepositoryOwner {
  type: 'User' | 'Org';
  name: string;
  email: string;
  htmlURL: string;
  avatarURL: string;
  diskUsage: number;
  repositories: RemoteRepository[];
}

export interface RemoteRepositoriesResponse {
  type: string;
  owners: RemoteRepositoryOwner[];
}
