import { AUTH_API_GROUP_VERSION, Constants } from '@app/constants';
import { get } from 'lodash-es';

import {
  Project,
  ProjectData,
  ProjectMetaData,
  ProjectResponse,
} from './project-api.types';

export function toModel(
  resource: ProjectResponse,
  constants: Constants,
): Project {
  if (!resource) {
    return {} as Project;
  }

  const meta =
    resource.objectMeta || resource.metadata || ({} as ProjectMetaData);
  const annotations = (meta.annotations || {}) as { [key: string]: string };
  return {
    name: meta.name,
    creationTimestamp: meta.creationTimestamp,
    displayName: annotations[constants.ANNOTATION_DISPLAY_NAME_2],
    description: annotations[constants.ANNOTATION_DESCRIPTION],
    clusters: get(resource, 'spec.clusters') || [],
    __orignal: resource.data,
  };
}

export function toResource(
  { __orignal, ...model }: Project,
  constants: Constants,
): ProjectData {
  const { metadata, ...orignal } = __orignal || ({} as ProjectData);
  const annotations = (metadata && metadata.annotations) || {};

  return {
    apiVersion: AUTH_API_GROUP_VERSION,
    kind: 'Project',
    ...orignal,
    metadata: {
      ...(metadata || {}),
      name: model.name,
      annotations: {
        ...annotations,
        [constants.ANNOTATION_DISPLAY_NAME]: model.displayName,
        [constants.ANNOTATION_DESCRIPTION]: model.description,
        // [constants.ANNOTATION_PRODUCT]: PRODUCT_NAME, // TODO: not sure remove affect
      },
    },
  };
}
