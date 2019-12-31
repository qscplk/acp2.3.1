import { BindingParams, K8SResource, ListResult } from '@app/api/api.types';
import {
  JenkinsBinding,
  JenkinsService,
} from '@app/api/jenkins/jenkins-api.types';
import { ToolIntegrateParams } from '@app/api/tool-chain/tool-chain-api.types';
import { API_GROUP_VERSION, Constants } from '@app/constants';
import { get } from 'lodash-es';

export function mapResourceToJenkinsBinding(
  resource: K8SResource,
  constants: Constants,
): JenkinsBinding {
  const secret = `${get(resource, 'spec.account.secret.namespace') || ''}/${get(
    resource,
    'spec.account.secret.name',
  ) || ''}`;

  const meta = get(resource, 'objectMeta') || get(resource, 'metadata');

  return {
    name: get(meta, 'name', ''),
    namespace: get(meta, 'namespace', ''),
    description: get(
      meta,
      ['annotations', constants.ANNOTATION_DESCRIPTION],
      '',
    ),
    creationTimestamp: get(meta, 'creationTimestamp', ''),
    secret,
    service: get(resource, 'spec.jenkins.name', ''),
    host: get(resource, 'spec.http.host', ''),
    status: {
      phase: get(resource, 'status.status', ''),
      message: get(resource, 'status.message', ''),
    },
    __original: resource,
  };
}

export function toSecretIdentity(value: string) {
  const [namespace, name] = (value || '').split('/');

  return {
    namespace,
    name: name || '',
  };
}

export function mapFindBindingResponseToList(
  res: any,
): ListResult<JenkinsBinding> {
  return {
    total: get(res, 'listMeta.totalItems'),
    items: res.jenkinsbindings.map(mapResourceToJenkinsBinding),
    errors: res.errors,
  };
}

export function toCreateBindingResource(
  model: BindingParams,
  constants: Constants,
): any {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: 'JenkinsBinding',
    metadata: {
      name: model.name,
      annotations: {
        [constants.ANNOTATION_DESCRIPTION]: model.description,
        // [constants.ANNOTATION_PRODUCT]: PRODUCT_NAME, TODO: temp remove
      },
      namespace: model.namespace,
    },
    spec: {
      jenkins: {
        name: model.service,
      },
      account: {
        secret: {
          ...toSecretIdentity(model.secret),
          usernameKey: 'username',
          apiTokenKey: 'password',
        },
      },
    },
  };
}

export function mapResourceToJenkinsService(resource: any): JenkinsService {
  return {
    name: get(resource, 'metadata.name', ''),
    creationTimestamp: get(resource, 'metadata.creationTimestamp', ''),
    host: get(resource, 'spec.http.host', ''),
    accessUrl: get(resource, 'spec.http.accessUrl', ''),
    html: get(resource, 'spec.http.html', ''),
    secretName: get(resource, 'spec.secret.name', ''),
    secretNamespace: get(resource, 'spec.secret.namespace', ''),
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    __original: resource,
  };
}

export function mapIntegrateConfigToJenkinsPayload(data: ToolIntegrateParams) {
  return {
    metadata: {
      name: data.name,
    },
    spec: {
      http: {
        host: data.host,
        accessUrl: data.accessUrl,
      },
      secret: {
        name: data.secretName,
        namespace: data.secretNamespace,
      },
    },
  };
}
