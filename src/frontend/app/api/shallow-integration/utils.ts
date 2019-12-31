import { K8SResource } from '@app/api/api.types';
import { ShallowService } from '@app/api/shallow-integration/shallow-integration-api.types';
import { ToolIntegrateParams } from '@app/api/tool-chain/tool-chain-api.types';
import { API_GROUP_VERSION } from '@app/constants';
import { get } from 'lodash-es';

export enum ShallowKind {
  TestTool = 'testtool',
}

export function getCamelCaseKind(kind: ShallowKind) {
  return kind === ShallowKind.TestTool ? 'TestTool' : kind;
}

export function mapIntegrateConfigToK8SResource(
  kind: ShallowKind,
  data: ToolIntegrateParams,
) {
  return {
    apiVersion: API_GROUP_VERSION,
    kind: getCamelCaseKind(kind),
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
    },
  };
}

export function mapResourceToShallowService(
  resource: K8SResource,
): ShallowService {
  return {
    name: get(resource, 'metadata.name', ''),
    creationTimestamp: get(resource, 'metadata.creationTimestamp', ''),
    type: get(resource, 'spec.type', ''),
    host: get(resource, 'spec.http.host', ''),
    html: get(resource, 'spec.http.html', ''),
    accessUrl: get(resource, 'spec.http.accessUrl', ''),
    secretName: get(resource, 'spec.secret.name', ''),
    secretNamespace: get(resource, 'spec.secret.namespace', ''),
    status: {
      phase: get(resource, 'status.phase', ''),
      message: get(resource, 'status.message', ''),
    },
    shallow: true,
    __original: resource,
  };
}
