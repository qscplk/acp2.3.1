import { ResourceBinding, ResourceService } from '@app/api/api.types';

export interface ProjectManagementService extends ResourceService {
  type: string;
}

export interface ProjectManagementBinding extends ResourceBinding {
  placeholder?: string;
  accessUrl?: string;
  projectManagementProjectInfos?: ProjectManagementProjectInfos[];
  projectManagementProjects?: [];
}

export interface ProjectManagementProjectInfos {
  id: string;
  name: string;
  key: string;
}
export interface ProjectManagementProject {
  lastAttempt: string;
  message: string;
  name: string;
  status: string;
  type: string;
}

export interface ProjectManagementProjectItem {
  name: string;
  leader: string;
  key: string;
  projectlink: string;
  id: string;
  status: string;
  message: string;
}

export interface ProjectManagementProjects {
  metadata?: {};
  items: ProjectItems[];
}

export interface ProjectItems {
  metadata: {
    name: string;
    creationTimestamp?: string;
    annotations: {
      description?: string;
      id: string;
      key: string;
      lead?: string;
      self?: string;
    };
  };
  data?: any;
}

export interface ProjectManagementIssueOption {
  status: IssueOption[];
  issuetype: IssueOption[];
  priority: IssueOption[];
}

interface IssueOption {
  name: string;
  id: string;
  data: string;
}

export const ALL_SYMBOL = Symbol();

export interface IssuesQueryOptions {
  project: string | typeof ALL_SYMBOL;
  type: string | typeof ALL_SYMBOL;
  priority: string | typeof ALL_SYMBOL;
  status: string | typeof ALL_SYMBOL;
  issuekey: string;
  summary: string;
}

export interface IssueItem {
  selflink: string;
  key: string;
  summary: string;
  description: string;
  comments: any;
  issuelinks: any;
  priority: {
    name: string;
  };
  issuetype: {
    name: string;
  };
  status: {
    name: string;
    id: string;
  };
  project: {
    metadata: {
      name: string;
      creationTimestamp: any;
    };
    data: any;
  };
  created: string;
  updated: string;
  creator: {
    username: string;
    email: string;
    id: string;
  };
  assignee: {
    username: string;
    email: string;
    id: string;
  };
}
