import { ListResult } from '@app/api/api.types';
import {
  CodeRepositoryModel,
  PipelineConfig,
  PipelineConfigModel,
  PipelineConfigResponse,
  PipelineConfigTriggerResponse,
  PipelineHistory,
  PipelineKind,
  PipelineTemplate,
  PipelineTemplateResource,
  PipelineTemplateSync,
  PipelineTemplateSyncConfig,
  PipelineTemplateSyncResponse,
  PipelineTrigger,
  TemplateAgent,
  TemplateCategory,
} from '@app/api/pipeline/pipeline-api.types';
import { Application } from '@app/api';
import { plural } from 'pluralize';
import {
  ANNOTATION_TEMPLATE_STYLE_ICON,
  Constants,
  PIPELINE_KIND,
} from '@app/constants';
import { find, get, head, map } from 'lodash-es';

export function toPipelineConfigList(
  response: any,
  constants: Constants,
): ListResult<PipelineConfig> {
  return {
    total: get(response, ['listMeta', 'totalItems'], 0),
    items: mapPipelinesResponse(response.pipelineconfigs, constants),
    errors: response.errors,
  };
}

export function mapPipelinesResponse(
  configs: any[],
  constants: Constants,
): PipelineConfig[] {
  return configs.map(config => toPipelineConfig(config, constants));
}

export function toPipelineConfig(
  config: any,
  constants: Constants,
): PipelineConfig {
  const metaKey = config.objectMeta ? 'objectMeta' : 'metadata';
  const kind = get(
    config,
    [metaKey, 'labels', PIPELINE_KIND],
    judgePipelineKind(config),
  );
  return {
    name: get(config, [metaKey, 'name'], ''),
    displayName: get(
      config,
      [metaKey, 'annotations', constants.ANNOTATION_DISPLAY_NAME],
      '',
    ),
    kind,
    labels: get(config, [metaKey, 'labels'], ''),
    annotations: get(config, [metaKey, 'annotations']),
    namespace: get(config, [metaKey, 'namespace'], ''),
    createdAt: get(config, [metaKey, 'creationTimestamp'], ''),
    application: get(config, [metaKey, 'labels', 'app'], ''),
    histories: (get(config, 'pipelines') || []).map((item: any) =>
      toPipelineHistory(item, constants),
    ),
    jenkinsInstance: get(config, 'spec.jenkinsBinding.name', ''),
    runPolicy: get(config, 'spec.runPolicy'),
    codeRepository: get(config, 'spec.source.git.uri', ''),
    source: get(config, 'spec.source'),
    parameters: get(config, 'spec.parameters') || [],
    strategy: {
      ...get(config, 'spec.strategy'),
      template: toPipelineTemplate(get(config, 'spec.strategy.template')),
    },
    template: get(config, ['spec', 'template'], []),
    triggers: (get(config, 'spec.triggers') || []).map(mapPipelineTrigger),
    status: get(config, 'status'),
    __original: config,
  };
}

function judgePipelineKind(config: any) {
  const template =
    get(config, 'objectMeta.labels.templateName') ||
    get(config, 'metadata.labels.templateName');
  if (template) {
    return PipelineKind.Template;
  } else {
    return PipelineKind.Script;
  }
}

export function mapPipelineTrigger(trigger: any): PipelineTrigger {
  const detail = trigger[trigger.type];
  return {
    type: trigger.type,
    enabled: detail.enabled,
    rule: detail.rule || detail.periodicCheck,
    schedule: detail.schedule,
  };
}

export function toPipelineHistory(
  history: any,
  constants: Constants,
): PipelineHistory {
  const metaKey = history.objectMeta ? 'objectMeta' : 'metadata';
  const sourceStages = JSON.parse(get(history, 'status.jenkins.stages', '{}'));
  const freshStages = get(sourceStages, 'tasks', []).map((item: any) => {
    return {
      ...item,
      name: item.displayName,
      status: item.state,
      edges: get(item, ['edges'], []),
    };
  });
  const jenkins = {
    ...get(history, 'status.jenkins', {}),
    stages: get(sourceStages, 'tasks')
      ? freshStages
      : get(sourceStages, 'stages', []),
  };
  const prDetail = JSON.parse(
    get(
      history,
      [
        metaKey,
        'annotations',
        `${constants.ANNOTATION_PREFIX}/jenkins.pr.detail`,
      ],
      '{}',
    ),
  );
  return {
    name: get(history, [metaKey, 'name'], ''),
    pipeline: get(history, 'spec.pipelineConfig.name', ''),
    badges: JSON.parse(
      get(history, [
        metaKey,
        'annotations',
        constants.ANNOTATION_PIPELINE_BADGES,
      ]) || '[]',
    ),
    createdAt: get(history, [metaKey, 'creationTimestamp'], ''),
    namespace: get(history, [metaKey, 'namespace'], ''),
    cause: get(history, 'spec.cause', ''),
    status: get(history, 'status', {}),
    jenkins,
    branch: get(
      history,
      [
        metaKey,
        'annotations',
        `${constants.ANNOTATION_PREFIX}/multiBranchName`,
      ],
      '',
    ),
    multiBranchCategory: get(
      history,
      [
        metaKey,
        'annotations',
        `${constants.ANNOTATION_PREFIX}/multiBranchCategory`,
      ],
      '',
    ),
    prTitle: get(prDetail, 'title', ''),
    prId: get(prDetail, 'id', ''),
    prSourceBranch: get(prDetail, 'sourceBranch', ''),
    prTargetBranch: get(prDetail, 'targetBranch', ''),
    prUrl: get(prDetail, 'url', ''),
    __original: history,
  };
}

export function toPipelineConfigResource(
  model: PipelineConfigModel,
  namespace: string,
  constants: Constants,
): PipelineConfigResponse {
  const result = {
    kind: 'Pipelineconfig',
    objectMeta: {
      annotations: {
        [constants.ANNOTATION_DISPLAY_NAME]: get(
          model,
          'basic.display_name',
          '',
        ),
      },
      name: get(model, 'basic.name', ''),
      namespace,
      labels: {
        app: get(model, 'basic.app', ''),
      },
    },
    spec: {
      runPolicy: get(model, 'basic.run_policy'),
      jenkinsBinding: {
        name: get(model, 'basic.jenkins_instance', ''),
      },
      source: toRepoResource(model),
      strategy: {
        jenkins: {
          jenkinsfile: get(model, ['editor_script', 'script'], ''),
          jenkinsfilePath: get(model, 'jenkinsfile.path', ''),
        },
      },
      template: get(model, 'template'),
      triggers: fromTrigger(model.triggers),
    },
  };

  if (get(model, 'editor_script.script')) {
    delete result.spec.source;
  }
  if (get(model, 'template')) {
    delete result.spec.source;
  }

  if (model.multiBranch) {
    (result.objectMeta.labels as any)[PIPELINE_KIND] = PipelineKind.MultiBranch;
    // TODO: any for assignable, refactor later
    (result as any).spec.strategy.jenkins.multiBranch = {
      orphaned: {
        days: 1,
        max: 50,
      },
      behaviours: {
        filterExpression: model.jenkinsfile.branch,
        discoverTags: true,
        discoverBranches: 'all',
        discoverPRFromOrigin: 'all',
        discoverPRFromForks: 'all',
        forksTrust: 'all',
      },
    };
    // TODO: triggers typed by sequence, refactor later.
    const trigger = head(model.triggers);
    if (trigger) {
      result.spec.triggers = [
        {
          type: 'cron',
          cron: {
            enabled: trigger.enabled,
            rule: trigger.cron_string,
            schedule: null,
          },
        },
      ];
    }
  }
  return result;
}

function fromTrigger(
  t: Array<{
    enabled: boolean;
    cron_string: string;
    sourceType?: string;
    cron_object?: any;
  }>,
): PipelineConfigTriggerResponse[] {
  const triggers = [];
  const sourceType = get(t[1], 'sourceType');
  if (get(t, '[0].cron_string', '')) {
    triggers.push({
      codeChange: {
        enabled: t[0].enabled,
        periodicCheck: t[0].cron_string,
      },
      type: 'codeChange',
    });
  }
  if (
    get(t, '[1].cron_string', '') ||
    get(t, '[1].cron_object.times.length', 0)
  ) {
    triggers.push({
      cron: {
        enabled: t[1].enabled,
        rule: sourceType === 'input' ? get(t, '[1].cron_string', '') : '',
        schedule:
          sourceType === 'select'
            ? outputTriggerDays(get(t, '[1].cron_object', ''))
            : null,
      },
      type: 'cron',
    });
  }
  return triggers;
}

function outputTriggerDays(object: any) {
  if (!object) {
    return;
  }
  return {
    weeks: Object.keys(object.days).filter((key: string) => object.days[key]),
    times: object.times,
  };
}

function inputTriggerDays(weeks: string[], times: string[]) {
  if (!weeks || !times) {
    return '';
  }
  const days: any = {
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun: false,
  };
  weeks.forEach((day: string) => {
    days[day] = true;
  });
  return {
    days,
    times,
  };
}

export function toPipelineConfigModel(
  pipelineConfig: PipelineConfig,
): PipelineConfigModel {
  const source = toRepoModel(pipelineConfig);
  const basic = {
    name: pipelineConfig.name,
    display_name: pipelineConfig.displayName,
    jenkins_instance: pipelineConfig.jenkinsInstance,
    app: get(pipelineConfig, 'labels.app', ''),
    source: jenkinsfileType(source),
    run_policy: pipelineConfig.runPolicy,
  };

  const jenkinsfile = {
    repo: source,
    branch:
      get(
        pipelineConfig,
        'strategy.jenkins.multiBranch.behaviours.filterExpression',
      ) ||
      get(pipelineConfig, 'source.git.ref', '') ||
      get(pipelineConfig, 'source.codeRepository.ref', ''),
    path: get(pipelineConfig, 'strategy.jenkins.jenkinsfilePath', ''),
  };

  const editorScript = {
    script: get(pipelineConfig, 'strategy.jenkins.jenkinsfile'),
  };
  const triggersSource = pipelineConfig.triggers;
  const codeChange = find(triggersSource, { type: 'codeChange' });
  const cron = find(triggersSource, { type: 'cron' });
  const sourceType = get(cron, 'schedule') ? 'select' : 'input';

  const multiBranch =
    get(pipelineConfig, ['labels', PIPELINE_KIND]) === 'multi-branch';

  const triggers = multiBranch
    ? [
        {
          enabled: cron.enabled,
          cron_string: cron.rule,
        },
      ]
    : [
        {
          enabled: get(codeChange, 'enabled', false),
          cron_string: get(codeChange, 'rule', ''),
        },
        {
          sourceType,
          enabled: get(cron, 'enabled', false),
          cron_string: get(cron, 'rule', ''),
          cron_object: inputTriggerDays(
            get(cron, 'schedule.weeks', ''),
            get(cron, 'schedule.times', ''),
          ),
        },
      ];

  return {
    template: pipelineConfig.template,
    basic,
    jenkinsfile,
    editor_script: editorScript,
    triggers,
    __original: pipelineConfig.__original,
  };
}

export function toPipelineTemplateSync(
  sync: PipelineTemplateSyncResponse,
): PipelineTemplateSync {
  if (!sync) {
    return;
  }
  return {
    name: get(sync, 'metadata.name', ''),
    ...get(sync, 'spec.source', ''),
    status: get(sync, 'status', ''),
    codeRepositoryName: get(sync, 'spec.source.codeRepository.name', ''),
    selectBranch: get(sync, 'spec.source.codeRepository.ref', ''),
    branch: get(sync, 'spec.source.git.ref', ''),
    secretName: get(sync, 'spec.source.secret.name', ''),
    gitUri: get(sync, 'spec.source.git.uri', ''),
    __original: sync,
  };
}

export function toPipelineTemplate(
  template: PipelineTemplateResource,
): PipelineTemplate {
  if (!template) {
    return;
  }
  return {
    name: get(template, 'metadata.name', ''),
    kind: (get(template, 'kind') || '').toLowerCase(),
    styleIcon: get(
      template,
      ['metadata', 'annotations', `${ANNOTATION_TEMPLATE_STYLE_ICON}`],
      '',
    ),
    displayName: {
      en: get(template, ['metadata', 'annotations', `displayName.en`], ''),
      'zh-CN': get(
        template,
        ['metadata', 'annotations', `displayName.zh-CN`],
        '',
      ),
    },
    labels: map(get(template, 'metadata.labels', {}), (value, key) => ({
      key,
      value,
    })),
    templateName: get(template, ['metadata', 'labels', 'templateName'], ''),
    description: {
      en: get(template, ['metadata', 'annotations', `description.en`], ''),
      'zh-CN': get(
        template,
        ['metadata', 'annotations', `description.zh-CN`],
        '',
      ),
    },
    version: get(template, ['metadata', 'annotations', 'version'], ''),
    latestVersion: get(
      template,
      ['metadata', 'annotations', 'latestVersion'],
      '',
    ),
    arguments: get(template, 'spec.arguments') || [],
    stages: get(template, 'spec.stages') || [],
    withSCM: get(template, 'spec.withSCM', false),
    // TODO: temp fix typings
    agent: get(template, ['spec', 'agent']) || ({} as TemplateAgent),
    options: get(template, ['spec', 'options', 'raw'], ''),
    __original: template,
  };
}

export function toPipelineTemplateSyncSource(
  config: PipelineTemplateSyncConfig,
): PipelineTemplateSyncResponse {
  return {
    metadata: {}, // todo: confirm post body
    spec: {
      source: config,
    },
    status: {
      phase: 'Pending',
    },
  };
}

export function templateStagesConvert(stages: any[]): any[] {
  let initID = 0;
  return stages
    .map((stage: any, stageIndex: number) => {
      let tasks = stage.tasks || [];
      const diagramStage: any = {
        id: ++initID,
        name: stage.name,
        edges: [],
      };
      if (tasks.length === 1) {
        diagramStage.name = tasks[0].name;
        tasks = [];
      } else if (tasks.length > 1) {
        tasks = tasks.map((task: any, taskIndex: number) => {
          const diagramTask: any = {
            id: ++initID,
            name: task.name,
            edges: [],
          };
          if (stages[stageIndex + 1]) {
            diagramTask.edges.push({
              id: initID + tasks.length - taskIndex,
              type: 'STAGE',
            });
          }
          return diagramTask;
        });
        diagramStage.edges = tasks.map((task: any) => ({
          id: task.id,
          type: 'PARALLEL',
        }));
      }
      if (stages[stageIndex + 1] && (!stage.tasks || stage.tasks.length <= 1)) {
        diagramStage.edges.push({ id: initID + 1, type: 'STAGE' });
      }
      return [diagramStage, ...tasks];
    })
    .reduce((accum, stageDiagramArray) => [...accum, ...stageDiagramArray], []);
}

export function toPipelineTemplateList(
  response: any,
): ListResult<PipelineTemplate> {
  return {
    total: get(response, 'listMeta.totalItems', 0),
    items: (get(response, 'pipelinetemplates') || []).map(toPipelineTemplate),
    errors: response.errors,
  };
}

export function toClusterPipelineTemplateList(
  response: any,
): ListResult<PipelineTemplate> {
  return {
    total: get(response, 'listMeta.totalItems', 0),
    items: (get(response, 'clusterpipelinetemplates') || []).map(
      toPipelineTemplate,
    ),
    errors: response.errors,
  };
}

export function toCategoryList(response: any): ListResult<TemplateCategory> {
  return {
    total: get(response, 'items', '').length,
    items: get(response, 'items') || [],
    errors: response.errors,
  };
}

export function toRepoModel(pipelineConfig: any): CodeRepositoryModel {
  const sourceType = get(pipelineConfig, 'source.sourceType');
  const bindingRepository = get(pipelineConfig, 'source.codeRepository.name');
  const git = get(pipelineConfig, 'source.git.uri');
  const svn = get(pipelineConfig, 'source.svn.uri');
  const secret = get(pipelineConfig, 'source.secret');
  const kind =
    sourceType === 'SVN'
      ? 'svn'
      : bindingRepository
      ? 'buildin'
      : git
      ? 'git'
      : null;

  return {
    kind,
    repo: !kind ? null : kind === 'svn' ? svn : git,
    secret,
    bindingRepository,
  };
}

export function toRepoResource(model: PipelineConfigModel) {
  if (get(model, 'editor_script.script') || get(model, 'template')) {
    return null;
  }

  const { kind, repo, secret, bindingRepository } = model.jenkinsfile.repo;
  const branch = model.jenkinsfile.branch;
  const secretIdentity = secret && {
    name: secret.name,
    namespace: secret.namespace,
  };

  const sourceType = kind === 'svn' ? 'SVN' : 'GIT';

  switch (kind) {
    case 'svn':
      return {
        sourceType,
        svn: {
          uri: repo,
          ref: branch,
        },
        secret: secretIdentity,
      };
    case 'git':
      return {
        sourceType,
        git: {
          uri: repo,
          ref: branch,
        },
        secret: secretIdentity,
      };
    case 'buildin':
      return {
        sourceType,
        codeRepository: {
          name: bindingRepository,
          ref: branch,
        },
        secret: secretIdentity,
      };
    default:
      return null;
  }
}

function jenkinsfileType(source: CodeRepositoryModel) {
  return source.kind ? 'repo' : 'script';
}

export function mapToWorkloadOptions(app: Application, type: string) {
  const workloadKey = plural(type);
  const workloads = get(app, workloadKey, []);
  const appName = get(app, 'name');
  return workloads.reduce((accService: any[], workload: any) => {
    const workloadName = get(workload, 'name');
    return [
      ...accService,
      {
        ...workload,
        opt_key: `${appName}/${type}/${workloadName}`,
        opt_value: `${appName}:${type}:${workloadName}`,
      },
    ];
  }, []);
}

export function getWorkloadContainerOptions(
  workloads: any[],
  relatedName: string,
) {
  const workload: any = head(
    workloads.filter((workload: any) => get(workload, 'name') === relatedName),
  );

  return (workload.containers || [])
    .concat(workload.initContainers || [])
    .map((container: any) => ({
      ...container,
      opt_key: container.name,
      opt_value: container.name,
    }));
}
