import { Constants } from '@app/constants';

import { ConfigMapDetail } from './configmap-api.types';
export function toConfigmap(
  body: any,
  isUpdate: boolean,
  displayName = '',
  constants: Constants,
) {
  const payload = {
    objectMeta: {
      name: body.metadata.name,
      namespace: body.metadata.namespace,
      labels: body.metadata.labels || {},
      annotations: body.metadata.annotations || {},
    },
    typeMeta: { kind: body.kind },
    data: body.data,
  };
  if (displayName || isUpdate) {
    payload.objectMeta.annotations[
      constants.ANNOTATION_DISPLAY_NAME
    ] = displayName;
  }
  return payload;
}

export function toConfigMapItems(items: any[], constants: Constants) {
  return items.map(item => {
    if (
      item.objectMeta.annotations &&
      item.objectMeta.annotations[constants.ANNOTATION_DISPLAY_NAME]
    ) {
      item.displayName =
        item.objectMeta.annotations[constants.ANNOTATION_DISPLAY_NAME];
    }
    return item;
  });
}

export function toConfigmapDetail(
  resource: ConfigMapDetail,
  constants: Constants,
) {
  if (
    resource.objectMeta.annotations &&
    resource.objectMeta.annotations[constants.ANNOTATION_DISPLAY_NAME]
  ) {
    resource.displayName =
      resource.objectMeta.annotations[constants.ANNOTATION_DISPLAY_NAME];
  }
  return resource;
}
