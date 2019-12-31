import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { K8SResource, ListResult } from '@app/api/api.types';
import { CodeQualityApiService } from '@app/api/code-quality/code-quality-api.service';
import { CodeApiService } from '@app/api/code/code-api.service';
import { JenkinsApiService } from '@app/api/jenkins/jenkins-api.service';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { ShallowIntegrationApiService } from '@app/api/shallow-integration/shallow-integration-api.service';
import {
  Tool,
  ToolBinding,
  ToolIntegrateParams,
  ToolService,
  ToolSupportedType,
  ToolType,
} from '@app/api/tool-chain/tool-chain-api.types';
import {
  ToolKind,
  buildResourceServiceToToolServiceMapper,
  mapResourceToToolBinding,
  mapToToolService,
  mapToToolType,
} from '@app/api/tool-chain/utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';
import { filterBy, getQuery } from '@app/utils/query-builder';
import { get } from 'lodash-es';
import { plural } from 'pluralize';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { ArtifactRegistryApiService } from './artifact-registry-api.service';

const TOOL_CHAINS_URL = '{{API_GATEWAY}}/devops/api/v1/settings/devops';
const TOOL_SERVICES_URL = '{{API_GATEWAY}}/devops/api/v1/toolchain';
const PROJECT_TOOL_BINDING_URL =
  '{{API_GATEWAY}}/devops/api/v1/toolchain/bindings';

@Injectable()
export class ToolChainApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly jenkinsApi: JenkinsApiService,
    private readonly codeRepoApi: CodeApiService,
    private readonly registryApi: RegistryApiService,
    private readonly codeQualityApi: CodeQualityApiService,
    private readonly shallowIntegrationApi: ShallowIntegrationApiService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly projectManagementApi: ProjectManagementApiService,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  getToolChains(): Observable<ToolType[]> {
    return this.http
      .get(TOOL_CHAINS_URL, {
        params: {
          sortBy: 'a,name',
        },
      })
      .pipe(map((res: any) => (res.toolChains || []).map(mapToToolType)));
  }

  findToolServices(type = ''): Observable<ListResult<ToolService>> {
    return this.http
      .get(TOOL_SERVICES_URL, {
        params: {
          tool_type: type,
          sortBy: 'a,name',
        },
      })
      .pipe(
        map((res: any) => ({
          total: res.listMeta.totalItems,
          items: (res.items || []).map((item: any) =>
            mapToToolService(item, this.constants),
          ),
          errors: res.errors,
        })),
      );
  }

  getToolService(kind: ToolKind, name: string): Observable<ToolService> {
    return this.getServiceApi(kind)(name).pipe(
      map(buildResourceServiceToToolServiceMapper(kind)),
    );
  }

  integrateTool(kind: ToolKind, data: ToolIntegrateParams) {
    return this.getIntegrateApi(kind)(data);
  }

  updateTool(kind: ToolKind, config: ToolIntegrateParams) {
    return this.getUpdateApi(kind)(config);
  }

  deleteTool(kind: ToolKind, name: string): Observable<void> {
    return this.getDeleteApi(kind)(name);
  }

  getBindingsByToolKind(
    kind: ToolKind,
    name: string,
  ): Observable<ToolBinding[]> {
    return this.getBindingsApi(kind)(name).pipe(
      map(res =>
        res.items.map((item: any) =>
          mapResourceToToolBinding(item.__original, this.constants),
        ),
      ),
    );
  }

  getBindingsByProject(
    namespace: string,
    type = '',
  ): Observable<ToolBinding[]> {
    return this.http
      .get(`${PROJECT_TOOL_BINDING_URL}/${namespace}`, {
        params: {
          tool_type: type,
          sortBy: 'a,name',
        },
      })
      .pipe(
        map((res: any) =>
          (res.items || []).map((item: K8SResource) =>
            mapResourceToToolBinding(item, this.constants),
          ),
        ),
      );
  }

  getSupportedSecretTypes(type: string) {
    return this.getToolChains().pipe(
      map((tools: ToolType[]) =>
        tools.reduce((accm: Tool[], cur: ToolType) => {
          return [...accm, ...cur.items];
        }, [] as Tool[]),
      ),
      map(
        tools =>
          get(
            tools.find(tool => tool.type === type),
            'supportedSecretTypes',
            [],
          ) as ToolSupportedType[],
      ),
    );
  }

  getAuthorizeStatus(info: {
    kind: ToolKind;
    name: string;
    secretName: string;
    namespace: string;
  }) {
    const kind = plural(info.kind.toLowerCase());
    const url = `{{API_GATEWAY}}/devops/api/v1/${kind}/authorize`;
    return this.http.get(url, {
      params: {
        secretName: info.secretName,
        namespace: info.namespace,
      },
    });
  }

  private getIntegrateApi(
    kind: ToolKind,
  ): (params: ToolIntegrateParams) => Observable<any> {
    switch (kind) {
      case ToolKind.Jenkins:
        return params => this.jenkinsApi.createService(params);
      case ToolKind.CodeRepo:
        return params => this.codeRepoApi.createService(params);
      case ToolKind.Registry:
        return params => this.registryApi.createService(params);
      case ToolKind.CodeQuality:
        return params => this.codeQualityApi.services.create(params);
      case ToolKind.ArtifactRegistryManager:
        return params => this.artifactRegistryApi.createService(params, kind);
      case ToolKind.ArtifactRegistry:
        return null;
      case ToolKind.ProjectManagement:
        return params => this.projectManagementApi.createService(params);
      default:
        return params => this.shallowIntegrationApi.createService(params, kind);
    }
  }

  private getServiceApi(kind: ToolKind): (name: string) => Observable<any> {
    switch (kind) {
      case ToolKind.Jenkins:
        return name => this.jenkinsApi.getService(name);
      case ToolKind.CodeRepo:
        return name => this.codeRepoApi.getService(name);
      case ToolKind.Registry:
        return name => this.registryApi.getService(name);
      case ToolKind.CodeQuality:
        return name => this.codeQualityApi.services.get(name);
      case ToolKind.ArtifactRegistry:
      case ToolKind.ArtifactRegistryManager:
        return name => this.artifactRegistryApi.getServiceDetail(kind, name);
      case ToolKind.ProjectManagement:
        return name => this.projectManagementApi.getService(name);
      default:
        return name => this.shallowIntegrationApi.getService(kind, name);
    }
  }

  private getUpdateApi(
    kind: ToolKind,
  ): (config: ToolIntegrateParams) => Observable<any> {
    switch (kind) {
      case ToolKind.Jenkins:
        return config => this.jenkinsApi.updateService(config);
      case ToolKind.CodeRepo:
        return config => this.codeRepoApi.updateService(config);
      case ToolKind.Registry:
        return config => this.registryApi.updateService(config);
      case ToolKind.CodeQuality:
        return config => this.codeQualityApi.services.update(config);
      case ToolKind.ArtifactRegistryManager:
        return config => this.artifactRegistryApi.updateService(kind, config);
      case ToolKind.ArtifactRegistry:
        return null;
      case ToolKind.ProjectManagement:
        return config => this.projectManagementApi.updateService(config);
      default:
        return config => this.shallowIntegrationApi.updateService(kind, config);
    }
  }

  private getDeleteApi(kind: ToolKind): (name: string) => Observable<any> {
    switch (kind) {
      case ToolKind.Jenkins:
        return name => this.jenkinsApi.deleteService(name);
      case ToolKind.CodeRepo:
        return name => this.codeRepoApi.deleteService(name);
      case ToolKind.Registry:
        return name => this.registryApi.deleteService(name);
      case ToolKind.CodeQuality:
        return name => this.codeQualityApi.services.delete(name);
      case ToolKind.ArtifactRegistryManager:
      case ToolKind.ArtifactRegistry:
        return name => this.artifactRegistryApi.deleteService(kind, name);
      case ToolKind.ProjectManagement:
        return name => this.projectManagementApi.deleteService(name);
      default:
        return name => this.shallowIntegrationApi.deleteService(kind, name);
    }
  }

  private getBindingsApi(
    kind: ToolKind,
  ): (name: string) => Observable<ListResult<any>> {
    switch (kind) {
      case ToolKind.Jenkins:
        return (name: string) =>
          this.jenkinsApi.findBindings(getQuery(filterBy('jenkins', name))); // todo: confirm query params
      case ToolKind.CodeRepo:
        return (name: string) =>
          this.codeRepoApi.findBindings(
            getQuery(filterBy('labels', `codeRepoService:${name}`)),
          );
      case ToolKind.Registry:
        return (name: string) =>
          this.registryApi.findBindings(
            getQuery(filterBy('labels', `imageRegistry:${name}`)),
          );
      case ToolKind.CodeQuality:
        return (name: string) =>
          this.codeQualityApi.bindings.find(
            getQuery(filterBy('labels', `codeQualityTool:${name}`)),
          );
      case ToolKind.ArtifactRegistry:
        return (name: string) =>
          this.artifactRegistryApi.findBindings(
            getQuery(filterBy('labels', `artifactRegistry:${name}`)),
          );
      case ToolKind.ProjectManagement:
        return name =>
          this.projectManagementApi.findBindings(
            getQuery(filterBy('labels', `projectManagement:${name}`)),
          );
      default:
        return () => of({ total: 0, items: [], errors: [] });
    }
  }
}
