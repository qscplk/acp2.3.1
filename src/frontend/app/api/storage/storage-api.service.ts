import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Pagination } from '@app/types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { filterBy, getQuery, pageBy, sortBy } from '../../utils/query-builder';

import { StorageModel, StoragesFindParams } from './storage-api.types';
import { toStorage, toStorageDetail, toStorageItems } from './utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class StorageApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  getStorages({
    name,
    pageIndex,
    itemsPerPage,
    cluster,
    namespace,
    sort,
    direction,
  }: StoragesFindParams): Observable<Pagination<any>> {
    return this.http
      .get<any>(
        `{{API_GATEWAY}}/devops/api/v1/persistentvolumeclaim/${namespace}`,
        {
          params: {
            cluster,
            ...getQuery(
              filterBy('name', name),
              sortBy(sort, direction === 'desc'),
              pageBy(pageIndex, itemsPerPage),
            ),
          },
        },
      )
      .pipe(
        map(res => ({
          total: res.listMeta.totalItems,
          items: toStorageItems(res.items, this.constants),
        })),
      );
  }

  createStorage(
    cluster: string,
    namespace: string,
    model: StorageModel,
    displayName = '',
  ): Observable<any> {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/persistentvolumeclaim/${namespace}`,
      toStorage(model, false, displayName, this.constants),
      {
        params: {
          cluster,
        },
      },
    );
  }

  getStorage(
    cluster: string,
    namespace: string,
    name: string,
  ): Observable<any> {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/persistentvolumeclaim/${namespace}/${name}`,
        {
          params: {
            cluster,
          },
        },
      )
      .pipe(map(item => toStorageDetail(item, this.constants)));
  }

  updateStorage(
    cluster: string,
    namespace: string,
    name: string,
    model: StorageModel,
    displayName = '',
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/persistentvolumeclaim/${namespace}/${name}`,
      toStorage(model, true, displayName, this.constants),
      {
        params: {
          cluster,
        },
      },
    );
  }

  deleteStorage(
    cluster: string,
    namespace: string,
    name: string,
  ): Observable<any> {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/persistentvolumeclaim/${namespace}/${name}`,
      {
        params: {
          cluster,
        },
      },
    );
  }

  getStorageclasses(cluster: string): Observable<any> {
    return this.http.get(`{{API_GATEWAY}}/devops/api/v1/storageclass`, {
      params: {
        cluster,
      },
    });
  }
}
