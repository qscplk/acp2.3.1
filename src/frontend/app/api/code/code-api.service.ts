import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { ListResult } from '@app/api/api.types';
import {
  CodeBinding,
  CodeBindingParams,
  CodeRepoRelatedResourcesResponse,
  CodeRepoServiceType,
  CodeRepoServicesResponse,
  CodeRepository,
  CodeService,
  RemoteRepositoriesResponse,
} from '@app/api/code/code-api.types';
import {
  mapCodeBindingParamsToK8SResource,
  mapCodeBindingToK8SResource,
  mapIntegrateConfigToCodePayload,
  mapResourceToCodeService,
  toCodeRepoBinding,
  toCodeRepository,
} from '@app/api/code/utils';
import { ToolIntegrateParams } from '@app/api/tool-chain/tool-chain-api.types';
import { Pagination } from '@app/types';
import { Observable, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class CodeApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  findCodeServiceTypes() {
    return forkJoin([
      this.findServices().pipe(
        map(result => result.items),
        map(items => items.filter(item => item.public)),
      ),
      this.http.get('{{API_GATEWAY}}/devops/api/v1/settings/devops').pipe(
        map((settings: any) => {
          return (settings.codeRepoServiceTypes as CodeRepoServiceType[]) || [];
        }),
      ),
    ]).pipe(
      map(([integrated, items]) => {
        return items.filter(
          item =>
            !item.public ||
            integrated.every(
              service => service.type.toLowerCase() !== item.type.toLowerCase(),
            ),
        );
      }),
    );
  }

  findCodeRepositories(
    namespace: string,
    query: { [name: string]: string } = null,
  ): Observable<Pagination<CodeRepository>> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/coderepository/${namespace}`, {
        params: query,
      })
      .pipe(
        map((res: any) => ({
          total: res.listMeta.totalItems,
          items: (res.coderepositories || []).map(toCodeRepository),
        })),
      );
  }

  findCodeRepositoriesByBinding(namespace: string, name: string) {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${namespace}/${name}/repositories`,
      )
      .pipe(
        map((res: any) => (res.coderepositories || []).map(toCodeRepository)),
      );
  }

  // TODO: no get code repository api
  getCodeRepository(namespace: string, name: string) {
    return this.findCodeRepositories(namespace).pipe(
      map(repositories => repositories.items.find(item => item.name === name)),
      tap(item => {
        if (!item) {
          throw new HttpErrorResponse({
            status: 404,
          });
        }
      }),
    );
  }

  findServices(): Observable<{ items: CodeService[]; length: number }> {
    return this.http.get('{{API_GATEWAY}}/devops/api/v1/codereposervice').pipe(
      map((res: CodeRepoServicesResponse) => ({
        items: (res.codereposervices || []).map(item =>
          mapResourceToCodeService(item, this.constants),
        ),
        length: res.listMeta.totalItems,
      })),
    );
  }

  findBindings(query: {
    [name: string]: string;
  }): Observable<ListResult<CodeBinding>> {
    return this.http
      .get('{{API_GATEWAY}}/devops/api/v1/coderepobinding', { params: query })
      .pipe(
        map((res: any) => ({
          items: (res.coderepobindings || []).map(toCodeRepoBinding),
          total: res.listMeta.totalItems,
          errors: res.errors,
        })),
      );
  }

  findBindingsByProject(
    project: string,
    query: { [name: string]: string },
  ): Observable<ListResult<CodeBinding>> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/coderepobinding/${project}`, {
        params: query,
      })
      .pipe(
        map((res: any) => ({
          items: (res.coderepobindings || []).map(toCodeRepoBinding),
          total: res.listMeta.totalItems,
          errors: res.errors,
        })),
      );
  }

  findBindingRelatedResources(namespace: string, name: string) {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${namespace}/${name}/resources`,
      )
      .pipe(map((res: CodeRepoRelatedResourcesResponse) => res.items || []));
  }

  findBindingRelatedSecrets(namespace: string, name: string) {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${namespace}/${name}/secrets`,
      )
      .pipe(
        map((res: any) =>
          (res.secrets || []).map((item: any) => item.objectMeta.name),
        ),
      );
  }

  findServiceRelatedResources(name: string) {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/codereposervice/${name}/resources`)
      .pipe(map((res: CodeRepoRelatedResourcesResponse) => res.items || []));
  }

  findServiceRelatedSecrets(name: string) {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/codereposervice/${name}/secrets`)
      .pipe(
        map((res: any) =>
          (res.secrets || []).map((item: any) => item.objectMeta.name),
        ),
      );
  }

  getService(name: string): Observable<CodeService> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/codereposervice/${name}`)
      .pipe(map(item => mapResourceToCodeService(item, this.constants)));
  }

  createService(model: ToolIntegrateParams) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/codereposervice`,
      mapIntegrateConfigToCodePayload(model),
    );
  }

  updateService(model: ToolIntegrateParams) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/codereposervice/${model.name}`,
      mapIntegrateConfigToCodePayload(model),
    );
  }

  deleteService(name: string) {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/codereposervice/${name}`,
    );
  }

  getBinding(namespace: string, name: string) {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/coderepobinding/${namespace}/${name}`)
      .pipe(map(item => toCodeRepoBinding(item, this.constants)));
  }

  createBinding(model: CodeBindingParams, redirectUrl?: string) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${model.namespace}`,
      mapCodeBindingParamsToK8SResource(model, this.constants),
      {
        params: {
          redirectUrl,
        },
      },
    );
  }

  updateBinding(model: CodeBinding, redirectUrl?: string) {
    return this.http.put<CodeRepoRelatedResourcesResponse>(
      `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${model.namespace}/${model.name}`,
      mapCodeBindingToK8SResource(model, this.constants),
      {
        params: {
          redirectUrl,
        },
      },
    );
  }

  deleteBinding(namespace: string, name: string) {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${namespace}/${name}`,
    );
  }

  getBindingRemoteRepositories(namespace: string, name: string) {
    return this.http.get<RemoteRepositoriesResponse>(
      `{{API_GATEWAY}}/devops/api/v1/coderepobinding/${namespace}/${name}/remote-repositories`,
    );
  }
}
