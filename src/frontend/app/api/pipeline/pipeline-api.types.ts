export interface PipelineParams {
  sortBy?: string;
  filterBy?: string;
  page?: string;
  itemsPerPage?: string;
}

export interface PipelineConfigListResponse {
  total: number;
  items: PipelineConfig[];
}

export interface PipelineIdentity {
  name: string;
  namespace: string;
}

export interface PipelineHistoryCause {
  type: 'manual' | 'cron' | 'codeChange';
  message: string;
}

export interface PipelineConfigStrategy {
  jenkins: { jenkinsfile?: string; jenkinsfilePath?: string };
  template?: PipelineTemplate;
}

export interface PipelineConfigTemplate {
  pipelineTemplateRef: {
    kind: string;
    name: string;
    namespace?: string;
  };
  values: PipelineConfigTemplateValues;
}

export interface PipelineConfigTemplateValues {
  [key: string]: string | boolean | {};
}

export interface PipelineRepositorySource {
  git?: {
    ref: string;
    uri: string;
  };
  svn?: {
    ref: string;
    uri: string;
  };
  path?: string;
  branch?: string;
  secret?: string;
  codeRepository: { name: string; ref: string };
}

export interface PipelineConfig extends PipelineIdentity {
  displayName: string;
  annotations: { [key: string]: string };
  kind: PipelineKind;
  labels: { [key: string]: string };
  application?: string;
  createdAt: string;
  histories: PipelineHistory[];
  jenkinsInstance: string;
  codeRepository: string;
  runPolicy: string;
  strategy: PipelineConfigStrategy;
  template: PipelineConfigTemplate;
  source: PipelineRepositorySource;
  parameters: TriggerPipelineParameter[];
  triggers: PipelineTrigger[];
  status?: any;
  __original: any;
}

export interface PipelineTrigger {
  type: string;
  enabled: boolean;
  rule: string;
  schedule?: { weeks: string[]; times: string[] };
}

export interface PipelineHistory {
  name: string;
  createdAt: string;
  namespace: string;
  badges?: Array<{ text: string; link: string }>;
  pipeline: string;
  cause?: PipelineHistoryCause;
  status: {
    [key: string]: any;
  };
  jenkins: {
    [key: string]: any;
  };
  branch?: string;
  prTitle?: string;
  prId?: string;
  prSourceBranch?: string;
  prTargetBranch?: string;
  prUrl?: string;
  multiBranchCategory?: string;
  __original: any;
}

export interface PipelineHistoryLog {
  more: boolean;
  text: string;
  nextStart: number;
}

export interface PipelineHistoryStep {
  id: string;
  type: string;
  displayDescription: string;
  displayName: string;
  durationInMillis: number;
  input: any;
  result: string;
  state: string;
  startTime: string;
  edges: any;
  text: string;
  actions?: any[];
}

export interface PipelineConfigTriggerResponse {
  codeChange?: {
    enabled: boolean;
    periodicCheck: string;
  };
  cron?: {
    enabled: boolean;
    rule: string;
    schedule?: { weeks: string[]; times: string[] };
  };
  type: string;
}

export interface PipelineConfigResponse {
  metadata?: {
    name: string;
    annotations?: any;
    namespace: string;
    labels?: any;
    displayName?: string;
  };
  objectMeta?: {
    name: string;
    annotations?: any;
    namespace: string;
    labels?: any;
    displayName?: string;
  };
  spec: {
    jenkinsBinding: {
      name: string;
    };
    runPolicy: string;
    source?: {
      git?: {
        ref: string;
        uri: string;
      };
      secret: {
        name: string;
        namespace: string;
      };
    };
    strategy?: {
      jenkins: {
        jenkinsfile: string;
        jenkinsfilePath: string;
        multiBranch?: any;
      };
    };
    triggers: PipelineConfigTriggerResponse[];
  };
  kind?: string;
  typeMeta?: {
    kind: string;
  };
}

export interface PipelineConfigModel {
  template?: PipelineConfigTemplate;
  strategy?: {
    template?: PipelineTemplate;
  };
  multiBranch?: boolean;
  basic: {
    name: string;
    display_name: string;
    jenkins_instance: string;
    app: string;
    source: string;
    run_policy: string;
  };
  jenkinsfile: {
    repo: CodeRepositoryModel;
    branch: string;
    path: string;
    secret?: string;
  };
  editor_script: {
    script: string;
  };
  triggers: Array<{
    enabled: boolean;
    cron_string: string;
  }>;
  __original: any;
}

export interface PipelineTemplateSyncCondition {
  lastTransitionTime: string;
  lastUpdateTime: string;
  message: string;
  name: string;
  reason: string;
  status: string;
  target: string;
  type: string;
  previousVersion: string;
  version: string;
}

export interface PipelineTemplateSyncStatus {
  commitID?: string;
  conditions?: PipelineTemplateSyncCondition[];
  endTime?: string;
  message?: string;
  phase?: string;
  startTime?: string;
}

export interface PipelineTemplateSyncResponse {
  metadata: {
    [key: string]: any;
  };
  spec: {
    source?: {
      codeRepository?: { name: string; ref: string };
      git?: { ref: string; uri: string };
      secret?: { name: string };
    };
  };
  status?: PipelineTemplateSyncStatus;
}

export interface PipelineTemplateSyncConfig {
  codeRepository?: { name: string; ref: string };
  git?: { ref: string; uri: string };
  secret?: { name: string };
  status?: {
    phase: 'Draft' | 'Pending' | 'Error' | 'Ready';
  };
}

export interface PipelineTemplateSync {
  name: string;
  codeRepository?: { name: string; ref: string };
  git?: { ref: string; uri: string };
  secret?: { name: string };
  status: PipelineTemplateSyncStatus;
  codeRepositoryName?: string;
  branch?: string;
  gitUri?: string;
  secretName?: string;
  __original: any;
}

export interface PipelineTemplateStage {
  kind: string;
  name: string;
  tasks: [
    {
      agent: TemplateAgent;
      approve: {
        message: string;
        timeout: number;
      };
      environments: [
        {
          name: string;
          value: string;
        },
      ];
      kind: string;
      name: string;
      options: {
        raw: string;
        timeout: number;
      };
      type: string;
    },
  ];
}

export interface PipelineTemplateResource {
  metadata: {
    [key: string]: any;
  };
  kind: string;
  spec: {
    agent: TemplateAgent;
    arguments: [
      {
        displayName: TemplateBasicDescription;
        items: TemplateArgumentItem[];
      },
    ];
    engine: string;
    parameters: [
      {
        description: string;
        name: string;
        type: string;
        value: string;
      },
    ];
    stages: PipelineTemplateStage[];
    withSCM: boolean;
  };
}

export interface PipelineTemplate {
  name: string;
  kind: string;
  displayName: TemplateBasicDescription;
  labels?: Array<{ key: string; value: string }>;
  description: TemplateBasicDescription;
  version: string;
  latestVersion?: string;
  arguments: TemplateArgumentField[];
  stages: PipelineTemplateStage[];
  styleIcon: string;
  withSCM: boolean;
  templateName?: string;
  agent?: TemplateAgent;
  options?: string;
  [key: string]: any;
  __original: any;
}

export interface TemplateAgent {
  label: string;
  labelMatcher?: string;
  raw?: string;
}

export interface TemplateBasicDescription {
  'zh-CN': string;
  en: string;
  [key: string]: string;
}

export interface TemplateArgumentItem {
  name: string;
  schema: { type: string };
  binding: string[];
  display: {
    type: string;
    name: TemplateBasicDescription;
  };
  description: TemplateBasicDescription;
  required: boolean;
  default?: any;
  validation?: any;
  relation?: any;
  value?: any;
}

export interface TemplateArgumentField {
  displayName: TemplateBasicDescription;
  items: TemplateArgumentItem[];
}

export interface TriggerPipelineParameter {
  description?: string;
  name: string;
  type?: string;
  value?: string;
  defaultParameterValue?: {
    name: string;
    value: string;
  };
}

export interface TemplateCategory {
  name: string;
}

export enum PipelineKind {
  Script = 'script',
  Scm = 'scm',
  Template = 'template',
  MultiBranch = 'multi-branch',
  Graph = 'graph',
}

export enum MultiBranchFilters {
  Branch = 'branch',
  PullRequest = 'pr',
  Tag = 'tag',
}

export interface CodeRepositoryModel {
  repo: string;
  secret: any;
  bindingRepository: string;
  kind?: 'buildin' | 'git' | 'svn';
}

export interface PiplineTaskInput {
  id: string;
  name: string;
  message: string;
  ok: string;
  parameters?: TriggerPipelineParameter[];
  submitter?: string;
}

export interface TriggerPipelineParametersModel {
  approve: boolean;
  inputID: string;
  parameters?: TriggerPipelineParameter[];
}

export interface PipelineStepInputBody extends TriggerPipelineParametersModel {
  stage: number;
  step: number;
}

export enum PiplineTaskInputStatus {
  Paused = 'paused',
  Executed = 'executed',
  Error = 'error',
}
export interface PipelineGlobalSettings {
  mode: string;
  label?: string;
  raw?: string;
  options: string;
  labelMatcher?: string;
}
