import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { BindingParams, K8SResource, ListResult } from '@app/api/api.types';
import {
  IssueItem,
  ProjectManagementBinding,
  ProjectManagementIssueOption,
  ProjectManagementProjects,
} from '@app/api/project-management/project-management.types';
import { get } from 'lodash-es';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ToolIntegrateParams } from '../tool-chain/tool-chain-api.types';

import {
  mapBindingParamsToK8SResource,
  mapIntegrateConfigToProjectManagement,
  mapProjectManagementBinding,
  mapResourceToProjectManagement,
} from './utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class ProjectManagementApiService {
  static readonly PROJECT_MANAGEMENT_URL =
    '{{API_GATEWAY}}/devops/api/v1/projectmanagement';
  static readonly PROJECT_MANAGEMENT_BINDING_URL =
    '{{API_GATEWAY}}/devops/api/v1/projectmanagementbinding';
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  createService(params: ToolIntegrateParams) {
    return this.http.post(
      ProjectManagementApiService.PROJECT_MANAGEMENT_URL,
      mapIntegrateConfigToProjectManagement(params),
    );
  }

  getService(name: string) {
    return this.http
      .get(`${ProjectManagementApiService.PROJECT_MANAGEMENT_URL}/${name}`)
      .pipe(map(mapResourceToProjectManagement));
  }

  updateService(params: ToolIntegrateParams) {
    return this.http.put(
      `${ProjectManagementApiService.PROJECT_MANAGEMENT_URL}/${params.name}`,
      mapIntegrateConfigToProjectManagement(params),
    );
  }

  deleteService(name: string) {
    return this.http.delete(
      `${ProjectManagementApiService.PROJECT_MANAGEMENT_URL}/${name}`,
    );
  }

  findBindings(
    query: Dictionary<string> = null,
  ): Observable<ListResult<ProjectManagementBinding>> {
    return this.http
      .get(ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL, {
        params: query,
      })
      .pipe(
        map((res: any) => ({
          total: res.listMeta.totalItems,
          items: (res.projectmanagebindings || []).map(
            mapProjectManagementBinding,
          ),
          errors: res.errors,
        })),
      );
  }

  getBinding(
    namespace: string,
    name: string,
  ): Observable<ProjectManagementBinding> {
    return this.http
      .get(
        `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${namespace}/${name}`,
      )
      .pipe(
        map((item: K8SResource) =>
          mapProjectManagementBinding(item, this.constants),
        ),
      );
  }

  createBinding(params: BindingParams): Observable<ProjectManagementBinding> {
    return this.http
      .post(
        `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${params.namespace}`,
        mapBindingParamsToK8SResource(params, this.constants),
      )
      .pipe(
        map((item: K8SResource) =>
          mapProjectManagementBinding(item, this.constants),
        ),
      );
  }

  updateBinding(payload: K8SResource) {
    const namespace = get(payload, ['metadata', 'namespace'], '');
    const name = get(payload, ['metadata', 'name'], '');
    return this.http
      .put(
        `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${namespace}/${name}`,
        payload,
      )
      .pipe(
        map((item: K8SResource) =>
          mapProjectManagementBinding(item, this.constants),
        ),
      );
  }

  deleteBinding(namespace: string, name: string) {
    return this.http.delete(
      `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${namespace}/${name}`,
    );
  }

  getProjectsByBinding(
    serviceName: string,
    secretName: string,
    secretNameSpace: string,
  ) {
    return this.http
      .get(
        `${ProjectManagementApiService.PROJECT_MANAGEMENT_URL}/${serviceName}/remoteprojects`,
        {
          params: {
            secretName,
            namespace: secretNameSpace,
          },
        },
      )
      .pipe(
        catchError(() =>
          of({
            items: [],
          }),
        ),
      ) as Observable<ProjectManagementProjects>;
  }

  getIssuesList(
    namespace: string,
    name: string,
    query: Dictionary<string> = null,
  ) {
    return this.http.get(
      `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${namespace}/${name}/issueslist`,
      {
        params: query,
      },
    );
  }

  getIssuesOptions(namespace: string, name: string, type: string) {
    return this.http.get(
      `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${namespace}/${name}/issueoptions`,
      {
        params: {
          type,
        },
      },
    ) as Observable<ProjectManagementIssueOption>;
  }

  getIssueDetailByKey(project: string, name: string, key: string) {
    return this.http.get(
      `${ProjectManagementApiService.PROJECT_MANAGEMENT_BINDING_URL}/${project}/${name}/issue`,
      {
        params: {
          key,
        },
      },
    ) as Observable<IssueItem>;
  }
}
