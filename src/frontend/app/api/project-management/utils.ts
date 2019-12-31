import { API_GROUP_VERSION, Constants } from '@app/constants';
import { get, head } from 'lodash-es';

import { BindingParams, K8SResource } from '../api.types';
import { SecretType } from '../secret/secret-api.types';
import { ToolIntegrateParams } from '../tool-chain/tool-chain-api.types';

import {
  ProjectManagementBinding,
  ProjectManagementProject,
  ProjectManagementService,
} from './project-management.types';

export function mapIntegrateConfigToProjectManagement(
  data: ToolIntegrateParams,
) {
  return {
    kind: 'ProjectManagement',
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

export function mapResourceToProjectManagement(
  resource: K8SResource,
): ProjectManagementService {
  return {
    name: get(resource, 'metadata.name', ''),
    creationTimestamp: get(resource, 'metadata.creationTimestamp', ''),
    host: get(resource, 'spec.http.host', ''),
    status: resource.status,
    type: get(resource, 'spec.type', ''),
    accessUrl: get(resource, 'spec.http.accessUrl', ''),
    secretName: get(resource, 'spec.secret.name', ''),
    secretNamespace: get(resource, 'spec.secret.namespace', ''),
    __original: resource,
  };
}

export function mapProjectManagementBinding(
  resource: K8SResource,
  constants: Constants,
): ProjectManagementBinding {
  if (!resource) {
    return null;
  }

  const meta = resource.metadata || resource.objectMeta;

  const { name, namespace, creationTimestamp } = meta;
  const service = get(resource, 'spec.projectManagement.name');
  const secret = get(resource, 'spec.secret') || {};
  const projectManagementProjectInfos = get(
    resource,
    'spec.projectManagementProjectInfos',
  );
  const conditions: ProjectManagementProject[] =
    get(resource, ['status', 'conditions']) || [];
  const projectManagementProjects = conditions.filter(
    (c: any) =>
      c.type === 'ProjectManagementProjects' && c.name === 'ProjectsInfo',
  );
  let projects;
  try {
    projects = JSON.parse(head(projectManagementProjects).message).item;
  } catch (e) {
    projects = [];
  }

  return {
    name,
    namespace,
    creationTimestamp,
    description: get(meta, ['annotations', constants.ANNOTATION_DESCRIPTION]),
    accessUrl: get(meta, ['annotations', constants.ANNOTATION_TOOL_ACCESS_URL]),
    secret: secret.name ? `${secret.namespace || ''}/${secret.name}` : '',
    service,
    serviceType: get(meta, [
      'annotations',
      constants.ANNOTATION_TOOL_ITEM_TYPE,
    ]),
    secretType: get(meta, [
      'annotations',
      `${constants.ANNOTATION_PREFIX}/secretType`,
    ]) as SecretType,
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    projectManagementProjectInfos: projectManagementProjectInfos || [],
    projectManagementProjects: projects,
    __original: resource,
  };
}

export function mapBindingParamsToK8SResource(
  model: BindingParams,
  constants: Constants,
): K8SResource {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: 'ProjectManagementBinding',
    metadata: {
      name: model.name,
      namespace: model.namespace,
      annotations: {
        [constants.ANNOTATION_DESCRIPTION]: model.description,
      },
      labels: {
        projectManagement: model.service,
      },
    },
    spec: {
      ProjectManagement: {
        name: model.service,
      },
      secret: {
        ...toSecretIdentity(model.secret),
        usernameKey: 'username',
        apiTokenKey: 'password',
      },
      ProjectManagementProjectInfos:
        (model as ProjectManagementBinding).projectManagementProjectInfos || [],
    },
  };
}

export function toSecretIdentity(value: string) {
  const [namespace, name] = (value || '').split('/');

  return {
    namespace,
    name: name || '',
  };
}
