import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import {
  ConfigMapFindParams,
  ConfigMapDetail,
} from '@app/api/configmap/configmap-api.types';
import { Pagination } from '@app/types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { filterBy, getQuery, pageBy, sortBy } from '../../utils/query-builder';

import { toConfigMapItems, toConfigmap, toConfigmapDetail } from './utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class ConfigMapApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  getConfigMaps({
    name,
    pageIndex,
    itemsPerPage,
    cluster,
    namespace,
    sort,
    direction,
  }: ConfigMapFindParams): Observable<Pagination<any>> {
    return this.http
      .get<any>(`{{API_GATEWAY}}/devops/api/v1/configmap/${namespace}`, {
        params: {
          cluster,
          ...getQuery(
            filterBy('name', name),
            sortBy(sort, direction === 'desc'),
            pageBy(pageIndex, itemsPerPage),
          ),
        },
      })
      .pipe(
        map(res =>
          Object.assign({
            total: res.listMeta.totalItems,
            items: toConfigMapItems(res.items, this.constants),
          }),
        ),
      );
  }

  getConfigMap(
    cluster: string,
    namespace: string,
    name: string,
  ): Observable<any> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/configmap/${namespace}/${name}`, {
        params: {
          cluster,
        },
      })
      .pipe(
        map((item: ConfigMapDetail) => toConfigmapDetail(item, this.constants)),
      );
  }

  createConfigMap(
    cluster: string,
    namespace: string,
    body: any,
    displayName = '',
  ): Observable<any> {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/configmap/${namespace}`,
      toConfigmap(body, false, displayName, this.constants),
      {
        params: {
          cluster,
        },
      },
    );
  }

  updateConfigMap(
    cluster: string,
    namespace: string,
    name: string,
    body: any,
    displayName = '',
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/configmap/${namespace}/${name}`,
      toConfigmap(body, true, displayName, this.constants),
      {
        params: {
          cluster,
        },
      },
    );
  }

  deleteConfigMap(
    cluster: string,
    namespace: string,
    name: string,
  ): Observable<any> {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/configmap/${namespace}/${name}`,
      {
        params: {
          cluster,
        },
      },
    );
  }
}
