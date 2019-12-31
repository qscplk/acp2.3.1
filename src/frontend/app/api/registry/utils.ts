import { Constants, API_GROUP_VERSION } from '@app/constants';
import { cloneDeep, get, set } from 'lodash-es';

import { BindingParams, K8SResource, ListResult } from '../api.types';
import {
  ImageRepository,
  ImageTag,
  RegistryBinding,
  RegistryService,
} from '../registry/registry-api.types';
import { SecretType } from '../secret/secret-api.types';
import { ToolIntegrateParams } from '../tool-chain/tool-chain-api.types';

export function mapIntegrateConfigToK8SResource(
  data: ToolIntegrateParams,
): K8SResource {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: 'ImageRegistry',
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

export function mapResourceToRegistryService(
  resource: K8SResource,
): RegistryService {
  const metaKey = 'metadata';
  return {
    name: get(resource, [metaKey, 'name'], ''),
    creationTimestamp: get(resource, [metaKey, 'creationTimestamp'], ''),
    type: get(resource, 'spec.type', ''),
    host: get(resource, 'spec.http.host', ''),
    accessUrl: get(resource, 'spec.http.accessUrl'),
    public: get(resource, 'spec.public', false),
    secretName: get(resource, 'spec.secret.name'),
    secretNamespace: get(resource, 'spec.secret.namespace'),
    html: get(resource, 'spec.http.html', ''),
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    __original: resource,
  };
}

export function mapResourceToRegistryBinding(
  resource: K8SResource,
  constants: Constants,
): RegistryBinding {
  const secret =
    get(resource, 'spec.secret') && get(resource, 'spec.secret.name')
      ? `${get(resource, 'spec.secret.namespace') || ''}/${get(
          resource,
          'spec.secret.name',
        ) || ''}`
      : '';
  const metaKey = 'metadata';
  return {
    name: get(resource, `${metaKey}.name`, ''),
    namespace: get(resource, `${metaKey}.namespace`, ''),
    kind: get(resource, 'kind', ''),
    description: get(
      resource,
      [metaKey, 'annotations', constants.ANNOTATION_DESCRIPTION],
      '',
    ),
    creationTimestamp: get(resource, `${metaKey}.creationTimestamp`, ''),
    secret,
    service: get(resource, 'spec.imageRegistry.name', ''),
    serviceType: get(resource, `${metaKey}.labels.imageRegistryType`, ''),
    secretType: get(
      resource,
      [metaKey, 'annotations', `${constants.ANNOTATION_PREFIX}/secretType`],
      SecretType.BasicAuth,
    ) as SecretType,
    repositories: get(resource, 'spec.repoInfo.repositories') || [],
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    __original: resource,
  };
}

export function mapBindingParamsToK8SResource(
  model: BindingParams,
  constants: Constants,
): K8SResource {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: 'ImageRegistryBinding',
    metadata: {
      name: model.name,
      namespace: model.namespace,
      annotations: {
        [constants.ANNOTATION_DESCRIPTION]: model.description,
      },
      labels: {
        imageRegistry: model.service,
      },
    },
    spec: {
      imageRegistry: {
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

export function mapRegsitryBindingToK8SResource(
  binding: RegistryBinding,
  constants: Constants,
): K8SResource {
  const result = cloneDeep(binding.__original);
  const secret = toSecretIdentity(binding.secret);

  set(result, 'kind', 'ImageRegistryBinding');
  set(result, 'metadata.name', binding.name);
  set(result, 'metadata.namespace', binding.namespace);
  set(
    result,
    ['metadata', 'annotations', constants.ANNOTATION_DESCRIPTION],
    binding.description,
  );
  set(result, 'metadata.labels.imageRegistry', binding.service);
  set(result, 'spec.imageRegistry.name', binding.service);
  set(result, 'spec.secret.name', secret.name);
  set(result, 'spec.secret.namespace', secret.namespace);
  set(result, 'spec.repoInfo.repositories', binding.repositories);
  return result;
}

export function mapResourceToRepository(res: K8SResource): ImageRepository {
  const meta = res.metadata;

  return {
    name: meta.name,
    namespace: meta.namespace,
    creationTimestamp: meta.creationTimestamp,
    image: get(res, 'spec.image', ''),
    endpoint: get(meta, 'annotations.imageRegistryEndpoint', ''),
    type: get(meta, 'annotations.imageRegistryType', ''),
    link: get(meta, 'annotations.imageRepositoryLink', ''),
    host: get(meta, 'annotations.imageRegistryEndpoint', ''),
    status: {
      phase: get(res, 'status.phase', ''),
      message: get(res, 'status.message', ''),
    },
    tags: (get(res, 'status.tags') || []).map(mapDataToRepoTag),
    secretName: get(meta, 'annotations.secretName', ''),
    secretNamespace: get(meta, 'annotations.secretNamespace', ''),
    scanDisabled:
      (get(meta, 'annotations.scanDisabled') || '').toLowerCase() === 'true',
    __original: res,
  };
}

export function mapDataToRepoTag(data: any): ImageTag {
  const { created_at, ...rest } = data;
  return {
    ...rest,
    createdAt: created_at,
  };
}

export function mapFindBindingResponseToList(
  res: any,
): ListResult<RegistryBinding> {
  return {
    total: get(res, 'listMeta.totalItems', 0),
    items: res.imageregistrybindings.map(mapResourceToRegistryBinding),
    errors: res.errors,
  };
}

export function mapFindRepositoriesResponseToList(
  res: any,
): ListResult<ImageRepository> {
  return {
    total: get(res, 'listMeta.totalItems', 0),
    items: res.imagerepositories.map(mapResourceToRepository),
    errors: res.errors,
  };
}

export function toSecretIdentity(value: string) {
  const [namespace, name] = (value || '').split('/');

  return {
    namespace,
    name: name || '',
  };
}

export function mapFindRegistryResponseToList(
  res: any,
): ListResult<RegistryService> {
  return {
    total: get(res, 'listMeta.totalItems', 0),
    items: res.imageregistries.map(mapResourceToRegistryService),
    errors: res.errors,
  };
}
