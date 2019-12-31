import { Constants } from '@app/constants';

import { StorageModel } from './storage-api.types';

export function toStorageItems(items: any[], constants: Constants) {
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

export function toStorage(
  model: StorageModel,
  isUpdate: boolean,
  displayName = '',
  constants: Constants,
) {
  const payload = {
    typeMeta: {
      apiVersion: model.apiVersion,
      kind: model.kind,
    },
    objectMeta: model.metadata,
    storageClass: model.spec.storageClassName,
    accessModes: model.spec.accessModes,
    capacity: model.spec.resources.requests,
  };
  if (displayName || isUpdate) {
    payload.objectMeta.annotations[
      constants.ANNOTATION_DISPLAY_NAME
    ] = displayName;
  }
  return payload;
}

export function toStorageDetail(resource: any, constants: Constants) {
  if (
    resource.objectMeta.annotations &&
    resource.objectMeta.annotations[constants.ANNOTATION_DISPLAY_NAME]
  ) {
    resource.displayName =
      resource.objectMeta.annotations[constants.ANNOTATION_DISPLAY_NAME];
  }
  return resource;
}
