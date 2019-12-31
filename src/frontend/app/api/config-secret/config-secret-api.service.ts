import { TranslateService } from '@alauda/common-snippet';
import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { ConfigSecretsFindParams } from '@app/api/config-secret/config-secret-api.types.ts';
import { Pagination } from '@app/types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { filterBy, getQuery, pageBy, sortBy } from '../../utils/query-builder';

import { toSecret, toSecretDetail, toSecretItems } from './utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class ConfigSecretApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  getSecrets(
    { cluster, namespace }: ConfigSecretsFindParams,
    query?: ConfigSecretsFindParams,
    includePublic = false,
  ): Observable<Pagination<any>> {
    const params = {
      cluster,
      includePublic: includePublic ? 'true' : 'false',
    };
    if (query) {
      const { name, pageIndex, itemsPerPage, sort, direction } = query;
      const queryParams = getQuery(
        filterBy('name', name),
        sortBy(sort, direction === 'desc'),
        pageBy(pageIndex, itemsPerPage),
      );
      Object.assign(params, queryParams);
    }
    return this.http
      .get<any>(`{{API_GATEWAY}}/devops/api/v1/secret/${namespace}`, { params })
      .pipe(
        map(res =>
          Object.assign({
            total: res.listMeta.totalItems,
            items: toSecretItems(res.secrets, this.constants),
          }),
        ),
      );
  }

  getSecret(cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/secret/${namespace}/${name}`, {
        params: {
          cluster,
        },
      })
      .pipe(map(item => toSecretDetail(item, this.constants)));
  }

  createSecret(
    cluster: string,
    namespace: string,
    body: any,
    displayName = '',
  ): Observable<any> {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/secret/${namespace}`,
      toSecret(body, false, displayName, this.constants),
      {
        params: {
          cluster,
        },
      },
    );
  }

  deleteSecret(
    cluster: string,
    namespace: string,
    name: string,
  ): Observable<any> {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/secret/${namespace}/${name}`,
      {
        params: {
          cluster,
        },
      },
    );
  }

  updateConfigSecret(
    cluster: string,
    namespace: string,
    name: string,
    body: any,
    displayName = '',
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/secret/${namespace}/${name}`,
      toSecret(body, true, displayName, this.constants),
      {
        params: {
          cluster,
        },
      },
    );
  }

  getSecretTypeDisplayName(type: string) {
    switch (type) {
      case 'Opaque':
        return 'Opaque';
      case 'kubernetes.io/tls':
        return 'TLS';
      case 'kubernetes.io/ssh-auth':
        return this.translate.get('configsecret.ssh_auth');
      case 'kubernetes.io/basic-auth':
        return this.translate.get('configsecret.basic_auth');
      case 'kubernetes.io/dockerconfigjson':
        return this.translate.get('configsecret.dockerconfigjson');
      default:
        return type;
    }
  }

  getSecretIconType(type: string) {
    switch (type) {
      case 'Opaque':
        return 'secrets';
      case 'kubernetes.io/tls':
        return 'secrets';
      case 'kubernetes.io/ssh-auth':
        return 'secrets';
      case 'kubernetes.io/basic-auth':
        return 'credentials';
      case 'kubernetes.io/dockerconfigjson':
        return 'credentials';
      default:
        return 'secrets';
    }
  }
}
