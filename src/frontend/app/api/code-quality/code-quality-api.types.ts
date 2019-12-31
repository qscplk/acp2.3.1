import {
  K8SResource,
  ResourceBinding,
  ResourceService,
  ResourceStatus,
} from '@app/api/api.types';

import { ToolKind } from '../tool-chain/utils';

export interface CodeQualityService extends ResourceService {
  type: string;
  toolKind: ToolKind;
  toolType: string;
}

export interface CodeQualityBinding extends ResourceBinding {
  conditions?: any[];
  placeholder?: string; // TODO: temp for commit
}

export interface CodeQualityProject {
  name: string;
  namespace: string;
  creationTimestamp: string;
  toolType: string;
  bindingName: string;
  codeAddress: string;
  codeQualityTool: string;
  mainBranch: CodeQualityBranchCondition;
  branchs: CodeQualityBranchCondition[];
  status: ResourceStatus;
  link: string;
  __original: K8SResource;
}

export interface CodeQualityBranchCondition {
  branch: string;
  isMain: boolean;
  status: string;
  lastAttempt: string;
  language: {
    lineCount: number;
    text: string;
  };
  metrics: CodeQualityBranchMetric;
}

export interface CodeQualityBranchMetric {
  bugs: {
    value: string;
    level: string;
  };
  codeSmells: {
    value: string;
    level: string;
  };
  vulnerabilities: {
    value: string;
    level: string;
  };
  coverage: {
    value: string;
  };
  duplications: {
    value: string;
  };
}
