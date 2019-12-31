export function dropDuplicateUrlSlash(url: string) {
  return `${url}`.replace(/([^:]\/)\/+/g, '$1');
}
