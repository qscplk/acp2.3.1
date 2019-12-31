import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { BindingParams, ListResult, K8SResource } from '@app/api/api.types';
import {
  ImageRepository,
  ImageTag,
  RegistryBinding,
  RegistryService,
} from '@app/api/registry/registry-api.types';
import {
  mapBindingParamsToK8SResource,
  mapDataToRepoTag,
  mapFindBindingResponseToList,
  mapFindRegistryResponseToList,
  mapFindRepositoriesResponseToList,
  mapIntegrateConfigToK8SResource,
  mapRegsitryBindingToK8SResource,
  mapResourceToRegistryBinding,
  mapResourceToRegistryService,
  mapResourceToRepository,
} from '@app/api/registry/utils';
import { ToolIntegrateParams } from '@app/api/tool-chain/tool-chain-api.types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

const REGISTRY_URL = '{{API_GATEWAY}}/devops/api/v1/imageregistry';
const REGISTRY_BINDING_URL =
  '{{API_GATEWAY}}/devops/api/v1/imageregistrybinding';
const REPOSITORIES_URL = '{{API_GATEWAY}}/devops/api/v1/imagerepository';
const REPOSITORIES_PROJECT_URL =
  '{{API_GATEWAY}}/devops/api/v1/imagerepositoryproject';

@Injectable()
export class RegistryApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  createService(params: ToolIntegrateParams) {
    return this.http.post(
      REGISTRY_URL,
      mapIntegrateConfigToK8SResource(params),
    );
  }

  getService(name: string): Observable<RegistryService> {
    return this.http
      .get(`${REGISTRY_URL}/${name}`)
      .pipe(map(mapResourceToRegistryService));
  }

  findService(): Observable<ListResult<RegistryService>> {
    return this.http
      .get(`${REGISTRY_URL}`)
      .pipe(map(mapFindRegistryResponseToList));
  }

  updateService(data: ToolIntegrateParams) {
    return this.http.put(
      `${REGISTRY_URL}/${data.name}`,
      mapIntegrateConfigToK8SResource(data),
    );
  }

  deleteService(name: string) {
    return this.http.delete(`${REGISTRY_URL}/${name}`);
  }

  createBinding(params: BindingParams): Observable<RegistryBinding> {
    return this.http
      .post(
        `${REGISTRY_BINDING_URL}/${params.namespace}`,
        mapBindingParamsToK8SResource(params, this.constants),
      )
      .pipe(
        map((item: K8SResource) =>
          mapResourceToRegistryBinding(item, this.constants),
        ),
      );
  }

  getBinding(namespace: string, name: string): Observable<RegistryBinding> {
    return this.http
      .get(`${REGISTRY_BINDING_URL}/${namespace}/${name}`)
      .pipe(
        map((item: K8SResource) =>
          mapResourceToRegistryBinding(item, this.constants),
        ),
      );
  }

  updateBinding(params: RegistryBinding) {
    return this.http.put(
      `${REGISTRY_BINDING_URL}/${params.namespace}/${params.name}`,
      mapRegsitryBindingToK8SResource(params, this.constants),
    );
  }

  deleteBinding(namespace: string, name: string) {
    return this.http.delete(`${REGISTRY_BINDING_URL}/${namespace}/${name}`);
  }

  findBindings(query: {
    [key: string]: string;
  }): Observable<ListResult<RegistryBinding>> {
    return this.http
      .get(REGISTRY_BINDING_URL, { params: query })
      .pipe(map(mapFindBindingResponseToList));
  }

  findBindingsByProject(
    project: string = '',
    query: { [key: string]: string },
  ): Observable<ListResult<RegistryBinding>> {
    return this.http
      .get(`${REGISTRY_BINDING_URL}/${project}`, { params: query })
      .pipe(map(mapFindBindingResponseToList));
  }

  getAllRemoteRepositoriesByRegistryBinding(
    namespace: string,
    name: string,
  ): Observable<string[]> {
    return this.http
      .get(
        `${REGISTRY_BINDING_URL}/${namespace}/${name}/remote-repositories-project`,
      )
      .pipe(map((res: { items: string[] }) => res.items || []));
  }

  getRepositoriesByRegistryBinding(
    namespace: string,
    name: string,
  ): Observable<ListResult<ImageRepository>> {
    return this.http
      .get(`${REGISTRY_BINDING_URL}/${namespace}/${name}/repositories`)
      .pipe(map(mapFindRepositoriesResponseToList));
  }

  getRepository(namespace: string, name: string): Observable<ImageRepository> {
    return this.http
      .get(`${REPOSITORIES_URL}/${namespace}/${name}`)
      .pipe(map(mapResourceToRepository));
  }

  findRepositoriesByProject(
    project: string,
    query: { [key: string]: string },
  ): Observable<ListResult<ImageRepository>> {
    return this.http
      .get(`${REPOSITORIES_URL}/${project}`, { params: query })
      .pipe(map(mapFindRepositoriesResponseToList));
  }

  findRepositoryProjects(
    project: string,
    query: { [key: string]: string },
  ): Observable<ListResult<ImageRepository>> {
    return this.http
      .get(`${REPOSITORIES_PROJECT_URL}/${project}`, { params: query })
      .pipe(map(mapFindRepositoriesResponseToList));
  }

  findRepositoryTags(
    project: string,
    repo: string,
    query: { [key: string]: string },
  ): Observable<ListResult<ImageTag>> {
    return this.http
      .get(`${REPOSITORIES_URL}/${project}/${repo}/tags`, {
        params: query,
      })
      .pipe(
        map((res: any) => ({
          total: (res.tags && res.tags.length) || 0,
          items: (res.tags || []).map(mapDataToRepoTag),
          errors: res.errors,
        })),
      );
  }

  getSecurityDetail(namespace: string, repository: string, tag: string) {
    return this.http.get(
      `${REPOSITORIES_URL}/${namespace}/${repository}/security`,
      {
        params: { tag },
      },
    );
  }

  triggerSecurityScan(namespace: string, repository: string, tag: string) {
    return this.http.post(
      `${REPOSITORIES_URL}/${namespace}/${repository}/security`,
      null,
      {
        params: { tag },
        headers: {
          ['Content-Type']: 'application/json',
        },
      },
    );
  }
}
