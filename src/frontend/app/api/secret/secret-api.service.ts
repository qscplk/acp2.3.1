import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { groupBy } from 'lodash-es';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Secret, SecretIdentity, SecretResource } from './secret-api.types';
import { defaultFields, toModel, toResource } from './utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class SecretApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  default(): Secret {
    return {
      name: '',
      namespace: '',
      ownerReferences: null,
      displayName: '',
      type: null,
      ...defaultFields,
    };
  }

  find(
    query: { [name: string]: string },
    namespace = '',
    includePublic = false,
  ): Observable<{ items: Secret[]; length: number }> {
    const url = namespace
      ? `{{API_GATEWAY}}/devops/api/v1/secret/${namespace}`
      : '{{API_GATEWAY}}/devops/api/v1/secret';

    const params = namespace
      ? {
          ...query,
          includePublic: includePublic ? 'true' : 'false',
        }
      : query;

    return this.http.get(url, { params }).pipe(
      map((res: any) => ({
        items: (res.secrets || []).map((item: SecretResource) =>
          toModel(item, this.constants),
        ),
        errors: res.errors,
        length: res.listMeta.totalItems,
      })),
    );
  }

  get(identity: SecretIdentity) {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/secret/${identity.namespace}/${identity.name}`,
      )
      .pipe(map((item: SecretResource) => toModel(item, this.constants)));
  }

  post(secret: Secret) {
    if (secret.private) {
      return this.http
        .post(
          `{{API_GATEWAY}}/devops/api/v1/secret/${secret.namespace}`,
          toResource(secret, true, this.constants),
        )
        .pipe(map((item: SecretResource) => toModel(item, this.constants)));
    }

    return this.http
      .post(
        `{{API_GATEWAY}}/devops/api/v1/secret`,
        toResource(secret, true, this.constants),
      )
      .pipe(map((item: SecretResource) => toModel(item, this.constants)));
  }

  putDisplayName(secret: Secret) {
    return this.http
      .put(
        `{{API_GATEWAY}}/devops/api/v1/secret/${secret.namespace}/${secret.name}`,
        toResource(secret, false, this.constants),
      )
      .pipe(map((item: SecretResource) => toModel(item, this.constants)));
  }

  putData(secret: Secret) {
    return this.http
      .put(
        `{{API_GATEWAY}}/devops/api/v1/secret/${secret.namespace}/${secret.name}`,
        toResource(secret, true, this.constants),
      )
      .pipe(map((item: SecretResource) => toModel(item, this.constants)));
  }

  delete(namespace: string, name: string) {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/secret/${namespace}/${name}`,
    );
  }
}

export function groupByScope(secrets: Secret[]): Dictionary<Secret[]> {
  return {
    public: [],
    private: [],
    ...groupBy(secrets, (item: Secret) =>
      item.private ? 'private' : 'public',
    ),
  };
}
