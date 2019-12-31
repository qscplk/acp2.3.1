import { Constants } from '@app/constants';
import { cloneDeep, get, set } from 'lodash-es';

import { K8SResource } from '../api.types';
import { SecretType } from '../secret/secret-api.types';
import { ToolIntegrateParams } from '../tool-chain/tool-chain-api.types';

import {
  CodeBinding,
  CodeBindingParams,
  CodeRepository,
  CodeService,
} from './code-api.types';

export function toCodeRepoBinding(
  resource: any,
  constants: Constants,
): CodeBinding {
  const meta = resource.objectMeta || resource.metadata || ({} as any);
  const annotations = meta.annotations || ({} as any);
  const secret = `${get(resource, 'spec.account.secret.namespace') || ''}/${get(
    resource,
    'spec.account.secret.name',
  ) || ''}`;

  return {
    name: get(meta, 'name') || '',
    namespace: get(meta, 'namespace') || '',
    service: get(resource, 'spec.codeRepoService.name') || '',
    serviceType: get(meta, 'labels.codeRepoServiceType') || '',
    servicePublic: get(meta, 'labels.codeRepoServicePublic') || '',
    creationTimestamp: get(meta, 'creationTimestamp') || '',
    description: annotations[constants.ANNOTATION_DESCRIPTION] || '',
    secretType:
      (annotations[
        `${constants.ANNOTATION_PREFIX}/secretType`
      ] as SecretType) || SecretType.BasicAuth,
    secret,
    owners: get(resource, 'spec.account.owners') || [],
    status: resource.status,
    __original: resource,
  };
}

export function toCodeRepository(resource: K8SResource): CodeRepository {
  const metaKey = 'metadata';
  return {
    namespace: get(resource, [metaKey, 'namespace'], ''),
    name: get(resource, [metaKey, 'name'], ''),
    httpURL: get(resource, 'spec.repository.htmlURL', ''),
    cloneURL: get(resource, 'spec.repository.cloneURL', ''),
    sshURL: get(resource, 'spec.repository.sshURL', ''),
    ownerName: get(resource, 'spec.repository.owner.name', ''),
    size: get(resource, 'spec.repository.size', 0),
    sizeHumanize: get(resource, 'spec.repository.sizeHumanize', ''),
    commit: get(resource, 'status.repository.latestCommit.commitAt', ''),
    commitID: get(resource, 'status.repository.latestCommit.commitID', ''),
    type: get(resource, 'spec.repository.codeRepoServiceType', ''),
    fullName: get(resource, 'spec.repository.fullName', ''),
    secret: {
      namespace: get(resource, [metaKey, 'annotations', 'secretNamespace'], ''),
      name: get(resource, [metaKey, 'annotations', 'secretName'], ''),
    },
    status: resource.status,
  };
}

export function mapCodeBindingParamsToK8SResource(
  model: CodeBindingParams,
  constants: Constants,
): K8SResource {
  return {
    kind: 'coderepobinding',
    metadata: {
      name: model.name,
      namespace: model.namespace,
      labels: {
        codeRepoService: model.service,
      },
      annotations: {
        [constants.ANNOTATION_DESCRIPTION]: model.description,
        'devops.alauda.io/oauth2': model.secretType, // TODO: been used as type, keep unchanged.
      },
    },
    spec: {
      codeRepoService: {
        name: model.service,
      },
      account: {
        secret: toSecretIdentity(model.secret),
        owners: null,
      },
    },
  };
}

export function mapCodeBindingToK8SResource(
  binding: CodeBinding,
  constants: Constants,
): K8SResource {
  const result = cloneDeep(binding.__original);
  const secret = toSecretIdentity(binding.secret);

  set(result, 'metadata.name', binding.name);
  set(result, 'metadata.namespace', binding.namespace);
  set(result, 'metadata.labels.codeRepoService', binding.service);
  set(
    result,
    ['metadata', 'annotations', constants.ANNOTATION_DESCRIPTION],
    binding.description,
  );
  set(result, 'spec.codeRepoService.name', binding.service);
  set(result, 'spec.account.secret.name', secret.name);
  set(result, 'spec.account.secret.namespace', secret.namespace);
  set(result, 'spec.account.owners', binding.owners);
  return result;
}

export function toSecretIdentity(value: string) {
  const [namespace, name] = (value || '').split('/');

  return {
    namespace,
    name: name || '',
  };
}

export function mapResourceToCodeService(
  resource: any,
  constants: Constants,
): CodeService {
  return {
    name: get(resource, 'metadata.name', ''),
    creationTimestamp: get(resource, 'metadata.creationTimestamp', ''),
    host: get(resource, 'spec.http.host', ''),
    html: get(resource, 'spec.http.html', ''),
    status: resource.status,
    type: get(resource, 'spec.type', ''),
    public: get(resource, 'spec.public', false),
    accessUrl: get(resource, 'spec.http.accessUrl', ''),
    secretName: get(resource, 'spec.secret.name', ''),
    secretNamespace: get(resource, 'spec.secret.namespace', ''),
    createAppUrl: get(
      resource,
      [
        'metadata',
        'annotations',
        `${constants.ANNOTATION_PREFIX}/createAppUrl`,
      ],
      '',
    ),
    __original: resource,
  };
}

export function mapIntegrateConfigToCodePayload(data: ToolIntegrateParams) {
  return {
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
