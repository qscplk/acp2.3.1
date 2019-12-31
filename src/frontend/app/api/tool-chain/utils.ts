import { createResourceDefinitions } from '@alauda/common-snippet';
import { CodeService } from '@app/api/code/code-api.types';
import { JenkinsService } from '@app/api/jenkins/jenkins-api.types';
import { RegistryService } from '@app/api/registry/registry-api.types';
import { ShallowKind } from '@app/api/shallow-integration/utils';
import {
  ToolBinding,
  ToolService,
  ToolType,
} from '@app/api/tool-chain/tool-chain-api.types';
import { API_GROUP, Constants } from '@app/constants';
import { get, startCase } from 'lodash-es';

export enum ToolKind {
  Jenkins = 'jenkins',
  CodeRepo = 'codereposervice',
  Registry = 'imageregistry',
  CodeQuality = 'codequalitytool',
  ArtifactRegistry = 'artifactregistry',
  ArtifactRegistryManager = 'artifactregistrymanager',
  ProjectManagement = 'projectmanagement',
}

export enum BindingKind {
  Jenkins = 'jenkinsbinding',
  CodeRepo = 'coderepobinding',
  Registry = 'imageregistrybinding',
  CodeQuality = 'codequalitybinding',
  ArtifactRegistry = 'artifactregistrybinding',
  ProjectManagement = 'projectmanagementbinding',
}

export const ToolkindMappingK8sSources: Partial<Record<ToolKind, string>> = {
  [ToolKind.Jenkins]: 'jenkinses',
  [ToolKind.CodeRepo]: 'codereposervices',
  [ToolKind.Registry]: 'imageregistries',
  [ToolKind.CodeQuality]: 'codequalitytools',
  [ToolKind.ArtifactRegistry]: 'artifactregistries',
  [ToolKind.ArtifactRegistryManager]: 'artifactregistrymanagers',
  [ToolKind.ProjectManagement]: 'projectmanagements',
};

export const BindingKindMappingK8sBindingSources: Partial<Record<
  BindingKind | ToolKind,
  string
>> = {
  [BindingKind.Jenkins]: 'jenkinsbindings',
  [ToolKind.Jenkins]: 'jenkinsbindings',
  [BindingKind.CodeRepo]: 'coderepobindings',
  [ToolKind.CodeRepo]: 'coderepobindings',
  [BindingKind.Registry]: 'imageregistrybindings',
  [ToolKind.Registry]: 'imageregistrybindings',
  [BindingKind.CodeQuality]: 'codequalitybindings',
  [ToolKind.CodeQuality]: 'codequalitybindings',
  [BindingKind.ArtifactRegistry]: 'artifactregistrybindings',
  [ToolKind.ArtifactRegistry]: 'artifactregistrybindings',
  [BindingKind.ProjectManagement]: 'projectmanagementbindings',
  [ToolKind.ProjectManagement]: 'projectmanagementbindings',
};

export function getCamelCaseToolKind(kind: BindingKind) {
  switch (kind.toLowerCase()) {
    case BindingKind.CodeRepo:
      return 'codeRepoService';
    case BindingKind.Jenkins:
      return 'jenkins';
    case BindingKind.Registry:
      return 'imageRegistry';
    case BindingKind.CodeQuality:
      return 'codeQualityTool';
    case BindingKind.ArtifactRegistry:
      return 'artifactRegistry';
    case BindingKind.ProjectManagement:
      return 'projectManagement';
  }
}

const ENTERPRISE_KINDS = [ToolKind.CodeRepo];

export function mapToToolType(type: ToolType) {
  return {
    ...type,
    items: (type.items || []).map(item => ({
      ...item,
      kind: item.kind.toLowerCase() as ToolKind,
      type: item.type || item.kind,
      toolType: type.name,
      shallow: (Object.values(ShallowKind) as string[]).includes(item.kind),
    })),
  };
}

export function mapToToolService(ins: any, constants: Constants): ToolService {
  const kind = get(ins, 'kind', get(ins, 'typeMeta.kind'));
  const isPublic = get(ins, 'spec.public', false);
  const isEnterprise = ENTERPRISE_KINDS.includes(kind) && !isPublic;
  const metaKey = 'metadata' in ins ? 'metadata' : 'objectMeta';
  return {
    name: get(ins, [metaKey, 'name'], ''),
    creationTimestamp: get(ins, [metaKey, 'creationTimestamp'], ''),
    toolType: get(
      ins,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/toolType`],
      '',
    ),
    shallow: get(
      ins,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/shallow`],
      false,
    ),
    kind:
      kind ||
      get(
        ins,
        [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/toolType`],
        '',
      ).toLowerCase(),
    type: get(ins, 'spec.type', startCase(kind)),
    host: get(ins, 'spec.http.host', ''),
    accessUrl: get(ins, 'spec.http.accessUrl', ''),
    html: get(ins, 'spec.http.html', ''),
    ownerReferences: get(ins, [metaKey, 'ownerReferences']),
    public: isPublic,
    enterprise: isEnterprise,
    status: get(ins, 'status'),
    secretName: get(ins, 'spec.secret.name'),
    secretNamespace: get(ins, 'spec.secret.namespace'),
    secretType: get(ins, [
      metaKey,
      'annotations',
      `${constants.ANNOTATION_PREFIX}/secretType`,
    ]),
    integratedBy: get(
      ins,
      [
        metaKey,
        'annotations',
        `${constants.ANNOTATION_PREFIX}/toolItemProject`,
      ],
      '',
    ),
    recommendedVersion: get(
      ins,
      [
        metaKey,
        'annotations',
        `${constants.ANNOTATION_PREFIX}/recommendedVersion`,
      ],
      '',
    ),
    // todo: recommended description
    description: get(
      ins,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/description`],
      {},
    ),
    __original: ins,
  };
}

export function buildResourceServiceToToolServiceMapper(kind: ToolKind) {
  return (
    data: JenkinsService | CodeService | RegistryService,
  ): ToolService => {
    const isPublic = get(data, 'public', false);
    const serviceType = get(data, 'type', startCase(kind));
    return {
      ...data,
      kind,
      type: serviceType,
      toolType: serviceType,
      public: isPublic,
      enterprise: ENTERPRISE_KINDS.includes(kind) ? !isPublic : false,
    };
  };
}

export function mapResourceToToolBinding(
  res: any,
  constants: Constants,
): ToolBinding {
  const metaKey = 'metadata' in res ? 'metadata' : 'objectMeta';
  const bindingKind = get(res, 'kind', get(res, 'typeMeta.kind', ''));
  const toolKind = getCamelCaseToolKind(bindingKind);
  const toolIsPublic =
    get(
      res,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/toolItemPublic`],
      'false',
    ) === 'true';
  const toolIsEnterprise =
    ENTERPRISE_KINDS.includes(toolKind.toLowerCase() as ToolKind) &&
    !toolIsPublic;

  const secret = getNamespacedSecret(res);

  return {
    name: get(res, [metaKey, 'name'], ''),
    namespace: get(res, [metaKey, 'namespace'], ''),
    description: get(
      res,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/description`],
      '',
    ),
    kind: bindingKind,
    tool: {
      toolType: get(
        res,
        [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/toolType`],
        '',
      ),
      type:
        get(
          res,
          [
            metaKey,
            'annotations',
            `${constants.ANNOTATION_PREFIX}/toolItemType`,
          ],
          '',
        ) || startCase(toolKind),
      kind: toolKind.toLowerCase() as ToolKind,
      public: toolIsPublic,
      enterprise: toolIsEnterprise,
    },
    accessUrl: get(
      res,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/toolAccessUrl`],
      '',
    ),
    creationTimestamp: get(res, [metaKey, 'creationTimestamp'], ''),
    secret,
    service: get(res, ['spec', toolKind, 'name'], ''),
    status: {
      phase: get(res, 'status.phase', '') || get(res, 'status.status', ''),
      message: get(res, 'status.message', ''),
    },
    __original: res,
  };
}

function getNamespacedSecret(res: any) {
  const name =
    get(res, 'spec.account.secret.name', '') ||
    get(res, 'spec.secret.name', '');
  const namespace =
    get(res, 'spec.account.secret.namespace', '') ||
    get(res, 'spec.secret.namespace', '');

  return name && namespace ? `${namespace}/${name}` : null;
}

export const getToolChainResourceDefinitions = (toolkind?: string) => {
  return createResourceDefinitions({
    TOOLCHAIN: {
      type: toolkind,
      apiGroup: API_GROUP,
    },
    TOOLCHAIN_BINDINGS: {
      type: toolkind,
      apiGroup: API_GROUP,
    },
    TOOLCHAIN_ASSIGN_REPO: {
      type: 'toolbindings',
      apiGroup: API_GROUP,
    },
  }).RESOURCE_DEFINITIONS;
};
