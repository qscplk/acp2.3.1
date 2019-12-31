import { Constants } from '@app/constants';
import { get, head, mapValues } from 'lodash-es';

import { Secret, SecretResource, SecretType } from './secret-api.types';

export const defaultFields = {
  username: '',
  password: '',
  clientID: '',
  clientSecret: '',
  generic: {},
  dockerAddress: '',
  dockerUsername: '',
  dockerPassword: '',
  dockerEmail: '',
  hasAccessToken: false,
};

const adapter: {
  decode: Dictionary<(data: Dictionary<string>) => Dictionary<any>>;
  encode: Dictionary<(secret: Secret) => Dictionary<string>>;
} = {
  decode: {
    [SecretType.BasicAuth]: getBaseAuthFields,
    [SecretType.OAuth2]: getOAuth2Fields,
    [SecretType.DockerConfig]: getDockerRegistryFields,
    [SecretType.SSH]: getSSHFields,
    '*': getOpaqueFields,
  },
  encode: {
    [SecretType.BasicAuth]: getBaseAuthData,
    [SecretType.OAuth2]: getOAuth2Data,
    [SecretType.DockerConfig]: getDockerRegistryData,
    [SecretType.SSH]: getSSHData,
    '*': getOpaqueData,
  },
};

export function toModel(
  resource: SecretResource,
  constants: Constants,
): Secret {
  const { metadata, type, data } = normalizeResource(resource);

  return {
    name: get(metadata, 'name', ''),
    namespace: get(metadata, 'namespace', ''),
    displayName: get(
      metadata,
      ['annotations', constants.ANNOTATION_DISPLAY_NAME],
      '',
    ),
    private:
      get(metadata, [
        'annotations',
        `devops.${constants.ANNOTATION_PREFIX}/global`,
      ]) !== 'true',
    ownerReferences: get(metadata, 'ownerReferences') || [],
    creationTimestamp: get(metadata, 'creationTimestamp', ''),
    type,
    ...defaultFields,
    ...decode(type, data),
  };
}

export function toResource(
  secret: Secret,
  includeData = false,
  constants: Constants,
): SecretResource {
  const resource = {
    metadata: {
      name: secret.name,
      annotations: {
        [constants.ANNOTATION_DISPLAY_NAME]: secret.displayName,
        [`devops.${constants.ANNOTATION_PREFIX}/global`]: secret.private
          ? 'false'
          : 'true',
      },
      namespace: secret.private ? secret.namespace : '',
    },
    type: secret.type,
  };

  return includeData
    ? { ...resource, stringData: encode(secret.type, secret) }
    : resource;
}

function normalizeResource(resource: SecretResource) {
  const { objectMeta, ...rest } = resource;
  return objectMeta ? { metadata: objectMeta, ...rest } : resource;
}

function getBaseAuthFields(_: Dictionary<string>) {
  return {
    username: '',
    password: '',
  };
}

function getOAuth2Fields(data: Dictionary<string>) {
  return {
    clientID: '',
    clientSecret: '',
    hasAccessToken: !!data.accessToken,
  };
}

function getOpaqueFields(_: Dictionary<string>) {
  return { generic: {} };
}

function getDockerRegistryFields(data: Dictionary<string>) {
  const dockerConfigJSON = data['.dockerconfigjson'];
  if (!dockerConfigJSON) {
    return {};
  }
  const { auths } = JSON.parse(atob(dockerConfigJSON));
  const dockerAddress = head(Object.keys(auths || {}));

  return {
    dockerAddress,
    dockerUsername: '',
    dockerEmail: '',
    dockerPassword: '',
  };
}

function getSSHFields(_: Dictionary<string>) {
  return {
    sshPrivatekey: '',
  };
}

function getBaseAuthData({ username, password }: Secret): Dictionary<string> {
  return { username, password };
}

function getOAuth2Data({ clientID, clientSecret }: Secret): Dictionary<string> {
  return { clientID, clientSecret };
}

function getOpaqueData({ generic }: Secret): Dictionary<string> {
  return generic;
}

function getDockerRegistryData({
  dockerAddress,
  dockerUsername,
  dockerEmail,
  dockerPassword,
}: Secret): Dictionary<string> {
  return {
    '.dockerconfigjson': JSON.stringify({
      auths: {
        [dockerAddress]: {
          username: dockerUsername,
          email: dockerEmail,
          password: dockerPassword,
          auth: btoa(`${dockerUsername}:${dockerPassword}`),
        },
      },
    }),
  };
}

function getSSHData({ sshPrivatekey }: Secret): Dictionary<string> {
  return { 'ssh-privatekey': sshPrivatekey };
}

function decode(type: string, data: Dictionary<string>) {
  return (adapter.decode[type] || adapter.decode['*'])(
    mapValues(data || {}, value => value),
  );
}

function encode(type: string, secret: Secret) {
  return (adapter.encode[type] || adapter.encode['*'])(secret);
}
