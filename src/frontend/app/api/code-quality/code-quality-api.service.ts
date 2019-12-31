import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { BindingParams, ListResult, K8SResource } from '@app/api/api.types';
import debug from 'debug';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { ToolIntegrateParams } from '../tool-chain/tool-chain-api.types';

import {
  CodeQualityBinding,
  CodeQualityProject,
} from './code-quality-api.types';
import {
  mapBindingParamsToK8SResource,
  mapCodeQualityBinding,
  mapCodeQualityProject,
  mapCodeQualityService,
  mapIntegrateConfigToK8SResource,
} from './utils';
import { TOKEN_CONSTANTS } from '@app/constants';
import { Constants } from '@app/constants';

const log = debug('code-quality:api:');

const SERVICE_URL = '{{API_GATEWAY}}/devops/api/v1/codequalitytool';
const BINDING_URL = '{{API_GATEWAY}}/devops/api/v1/codequalitybinding';
const PROJECT_URL = '{{API_GATEWAY}}/devops/api/v1/codequalityproject';

class CodeQualityServiceApi {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  find(query: Dictionary<string> = null) {
    return this.http.get(SERVICE_URL, { params: query }).pipe(
      tap(log),
      map(res => ({
        total: res.listMeta.totalItems,
        items: (res.codequalityservices || []).map(mapCodeQualityService),
        errors: res.errors,
      })),
    );
  }

  get(name: string) {
    return this.http.get(`${SERVICE_URL}/${name}`).pipe(
      tap(log),
      map(item => mapCodeQualityService(item, this.constants)),
    );
  }

  create(params: ToolIntegrateParams) {
    return this.http
      .post(SERVICE_URL, mapIntegrateConfigToK8SResource(params))
      .pipe(tap(log));
  }

  update(data: ToolIntegrateParams): any {
    return this.http
      .put(`${SERVICE_URL}/${data.name}`, mapIntegrateConfigToK8SResource(data))
      .pipe(tap(log));
  }

  delete(name: string): any {
    return this.http.delete(`${SERVICE_URL}/${name}`).pipe(tap(log));
  }
}

class CodeQualityBindingApi {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  find(
    query: Dictionary<string> = null,
    namespace = '',
  ): Observable<ListResult<CodeQualityBinding>> {
    const url = namespace ? `${BINDING_URL}/${namespace}` : BINDING_URL;

    return this.http.get(url, { params: query }).pipe(
      tap(log),
      map((res: any) => ({
        total: res.listMeta.totalItems,
        items: (res.codequalitybindings || []).map(mapCodeQualityBinding),
        errors: res.errors,
      })),
    );
  }

  get(namespace: string, name: string) {
    return this.http.get(`${BINDING_URL}/${namespace}/${name}`).pipe(
      tap(log),
      map(item => mapCodeQualityBinding(item, this.constants)),
    );
  }

  create(binding: BindingParams): Observable<CodeQualityBinding> {
    return this.http
      .post(
        `${BINDING_URL}/${binding.namespace}`,
        mapBindingParamsToK8SResource(binding, this.constants),
      )
      .pipe(
        tap(log),
        map(item => mapCodeQualityBinding(item, this.constants)),
      );
  }

  update(binding: BindingParams): Observable<CodeQualityBinding> {
    return this.http
      .put(
        `${BINDING_URL}/${binding.namespace}/${binding.name}`,
        mapBindingParamsToK8SResource(binding, this.constants),
      )
      .pipe(
        tap(log),
        map(item => mapCodeQualityBinding(item, this.constants)),
      );
  }

  delete(namespace: string, name: string) {
    return this.http
      .delete(`${BINDING_URL}/${namespace}/${name}`)
      .pipe(tap(log));
  }
}

class CodeQualityProjectApi {
  constructor(
    private http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  find(
    namespace: string,
    query: Dictionary<string> = null,
  ): Observable<ListResult<CodeQualityProject>> {
    return this.http.get(`${PROJECT_URL}/${namespace}`, { params: query }).pipe(
      tap(log),
      map((res: any) => ({
        total: res.listMeta.totalItems,
        items: res.codequalityprojects.map((item: K8SResource) =>
          mapCodeQualityProject(item, this.constants),
        ),
        errors: res.errors,
      })),
    );
  }

  findByBinding(
    namespace: string,
    bindingName: string,
    query: Dictionary<string> = null,
  ) {
    return this.http
      .get(`${BINDING_URL}/${namespace}/${bindingName}/projects`, {
        params: query,
      })
      .pipe(
        tap(log),
        map((res: any) => ({
          total: res.listMeta.totalItems,
          items: res.codequalityprojects.map((item: K8SResource) =>
            mapCodeQualityProject(item, this.constants),
          ),
          errors: res.errors,
        })),
      );
  }
}

@Injectable()
export class CodeQualityApiService {
  services = new CodeQualityServiceApi(this.http, this.constants);
  bindings = new CodeQualityBindingApi(this.http, this.constants);
  projects = new CodeQualityProjectApi(this.http, this.constants);

  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}
}
