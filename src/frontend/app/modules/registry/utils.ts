import {
  ImageRepository,
  ImageTag,
} from '@app/api/registry/registry-api.types';

export function getFullImagePath(repo: ImageRepository) {
  return `${repo.endpoint}/${repo.image}`;
}

export function getFullTagPath(repo: ImageRepository, tag: ImageTag) {
  return `${getFullImagePath(repo)}:${tag.name}`;
}

export function getImagePathPrefix(repo: ImageRepository) {
  const fullPath = getFullImagePath(repo);
  return fullPath.slice(0, fullPath.lastIndexOf('/'));
}

export function getImagePathSuffix(repo: ImageRepository) {
  const fullPath = getFullImagePath(repo);
  return fullPath.slice(fullPath.lastIndexOf('/'));
}
