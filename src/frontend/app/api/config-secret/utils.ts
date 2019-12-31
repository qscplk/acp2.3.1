import { Constants } from '@app/constants';

export function toSecretItems(items: any[], constants: Constants) {
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

export function toSecret(
  body: any,
  isUpdate: boolean,
  displayName = '',
  constants: Constants,
) {
  const payload = {
    apiVersion: body.apiVersion,
    metadata: {
      name: body.metadata.name,
      namespace: body.metadata.namespace,
      labels: body.metadata.labels || {},
      annotations: body.metadata.annotations || {},
    },
    kind: body.kind,
    data: body.data,
    type: body.type,
  };
  if (displayName || isUpdate) {
    payload.metadata.annotations[
      constants.ANNOTATION_DISPLAY_NAME
    ] = displayName;
  }
  return payload;
}

export function toSecretDetail(resource: any, constants: Constants) {
  if (
    resource.metadata.annotations &&
    resource.metadata.annotations[constants.ANNOTATION_DISPLAY_NAME]
  ) {
    resource.displayName =
      resource.metadata.annotations[constants.ANNOTATION_DISPLAY_NAME];
  }
  return resource;
}
