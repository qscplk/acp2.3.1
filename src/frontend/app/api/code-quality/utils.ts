import { Constants, API_GROUP_VERSION } from '@app/constants';
import { get, head } from 'lodash-es';

import { BindingParams, K8SResource } from '../api.types';
import { SecretType } from '../secret/secret-api.types';
import { ToolIntegrateParams } from '../tool-chain/tool-chain-api.types';
import { ToolKind } from '../tool-chain/utils';

import {
  CodeQualityBinding,
  CodeQualityBranchCondition,
  CodeQualityProject,
  CodeQualityService,
} from './code-quality-api.types';

export function mapIntegrateConfigToK8SResource(
  data: ToolIntegrateParams,
): K8SResource {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: 'CodeQualityTool',
    metadata: {
      name: data.name,
    },
    spec: {
      http: {
        host: data.host,
        accessUrl: data.accessUrl,
      },
      type: data.type,
      secret: {
        name: data.secretName,
        namespace: data.secretNamespace,
      },
      public: data.public,
    },
  };
}

export function mapBindingParamsToK8SResource(
  model: BindingParams,
  constants: Constants,
): K8SResource {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: 'CodeQualityBinding',
    metadata: {
      name: model.name,
      namespace: model.namespace,
      annotations: {
        [constants.ANNOTATION_DESCRIPTION]: model.description,
      },
    },
    spec: {
      codeQualityTool: {
        name: model.service,
      },
      secret: {
        ...toSecretIdentity(model.secret),
        usernameKey: 'username',
        apiTokenKey: 'password',
      },
    },
  };
}

export function mapCodeQualityService(
  resource: K8SResource,
  constants: Constants,
): CodeQualityService {
  const meta = resource.objectMeta || resource.metadata;
  return {
    name: meta.name,
    creationTimestamp: meta.creationTimestamp,
    type: get(resource, 'spec.type', ''),
    host: get(resource, 'spec.http.host', ''),
    accessUrl: get(resource, 'spec.http.accessUrl', ''),
    html: get(resource, 'spec.http.html', ''),
    secretName: get(resource, 'spec.secret.name', ''),
    secretNamespace: get(resource, 'spec.secret.namespace', ''),
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    toolKind: get(meta, [
      'annotations',
      `${constants.ANNOTATION_PREFIX}/toolType`,
    ]) as ToolKind,
    toolType: get(meta, [
      'annotations',
      `${constants.ANNOTATION_PREFIX}/toolItemType`,
    ]),
    __original: resource,
  };
}

export function mapCodeQualityBinding(
  resource: K8SResource,
  constants: Constants,
): CodeQualityBinding {
  if (!resource) {
    return null;
  }

  const meta = resource.metadata || resource.objectMeta;

  const { name, namespace, creationTimestamp } = meta;
  const service = get(resource, 'spec.codeQualityTool.name');
  const secret = get(resource, 'spec.secret') || {};

  return {
    name,
    namespace,
    creationTimestamp,
    description: get(meta, ['annotations', constants.ANNOTATION_DESCRIPTION]),
    secret: secret.name ? `${secret.namespace || ''}/${secret.name}` : '',
    service,
    serviceType: get(meta, 'labels.codeQualityToolType', ''),
    secretType: get(
      meta,
      ['annotations', `${constants.ANNOTATION_PREFIX}/secretType`],
      SecretType.BasicAuth,
    ) as SecretType,
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    conditions: get(resource, 'status.conditions') || [],
    __original: resource,
  };
}

export function mapCodeQualityProject(
  resource: any,
  constants: Constants,
): CodeQualityProject {
  if (!resource) {
    return null;
  }

  const meta = resource.metadata || resource.objectMeta;
  const { name, namespace, creationTimestamp } = meta;
  const toolType = get(meta, 'annotations.codeQualityToolType');
  const bindingName = get(resource, 'spec.codeQualityBinding.name');
  const codeAddress = get(resource, 'spec.project.codeAddress');
  const codeQualityTool = get(resource, 'spec.codeQualityTool.name');
  const conditions = get(resource, 'status.conditions') || [];
  const phase = get(resource, 'status.phase');
  const message = get(resource, 'status.message');
  const link = get(meta, [
    'annotations',
    `${constants.ANNOTATION_PREFIX}/sonarqubeProjectLink`,
  ]);

  const branchs: CodeQualityBranchCondition[] = conditions.map(
    ({ metrics: { languages, ...metrics }, ...rest }: any) => ({
      ...rest,
      metrics,
      language: parseLanguage(languages.value),
    }),
  );

  const mainBranch = branchs.find(branch => branch.isMain) || head(branchs);

  return {
    name,
    namespace,
    creationTimestamp,
    bindingName,
    toolType,
    codeAddress,
    codeQualityTool,
    mainBranch,
    branchs,
    status: {
      phase,
      message,
    },
    link,
    __original: resource,
  };
}

function parseLanguage(text: string) {
  if (!text) {
    return {
      lineCount: 0,
      text: '',
    };
  }

  const languages = text.split(';');

  return languages.reduce(
    (accum, language) => {
      const [name, lineCount] = language.split('=');
      return {
        lineCount: accum.lineCount + parseInt(lineCount, 10),
        text: accum.text ? `${accum.text}, ${name}` : name,
      };
    },
    { lineCount: 0, text: '' },
  );
}

export function toSecretIdentity(value: string) {
  const [namespace, name] = (value || '').split('/');

  return {
    namespace,
    name: name || '',
  };
}
