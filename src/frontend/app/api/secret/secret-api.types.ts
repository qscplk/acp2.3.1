export enum SecretType {
  BasicAuth = 'kubernetes.io/basic-auth',
  Opaque = 'Opaque',
  DockerConfig = 'kubernetes.io/dockerconfigjson',
  OAuth2 = 'devops.alauda.io/oauth2',
  SSH = 'kubernetes.io/ssh-auth',
  TLS = 'kubernetes.io/tls',
}

export interface SecretIdentity {
  name: string;
  namespace: string;
}

export interface Secret extends SecretIdentity {
  displayName: string;
  type: SecretType;
  username?: string;
  password?: string;
  clientID?: string;
  clientSecret?: string;
  generic?: { [name: string]: any };
  dockerAddress?: string;
  dockerUsername?: string;
  dockerPassword?: string;
  dockerEmail?: string;
  ownerReferences: any[];
  hasAccessToken?: boolean;
  sshPrivatekey?: string;
  creationTimestamp?: string;
  private?: boolean;
  __orignal?: any;
}

export interface SecretResource {
  metadata?: {
    annotations?: Dictionary<string>;
    name: string;
    namespace: string;
    creationTimestamp?: string;
  };
  objectMeta?: {
    name: string;
    namespace: string;
    creationTimestamp: string;
  };
  data?: Dictionary<string>;
  stringData?: Dictionary<string>;
  type: SecretType;
}
