import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import {
  BindingParams,
  ListResult,
  ResourceService,
  K8SResource,
} from '@app/api/api.types';
import {
  JenkinsAgentLabel,
  JenkinsBinding,
  JenkinsResource,
} from '@app/api/jenkins/jenkins-api.types';
import {
  mapFindBindingResponseToList,
  mapIntegrateConfigToJenkinsPayload,
  mapResourceToJenkinsBinding,
  mapResourceToJenkinsService,
  toCreateBindingResource,
} from '@app/api/jenkins/utils';
import { ToolIntegrateParams } from '@app/api/tool-chain/tool-chain-api.types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class JenkinsApiService {
  static readonly PIPELINE_JENKINS_BINDING =
    '{{API_GATEWAY}}/devops/api/v1/jenkinsbinding';
  static readonly PIPELINE_JENKINS = '{{API_GATEWAY}}/devops/api/v1/jenkinses';

  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  findBindings(query: {
    [key: string]: string;
  }): Observable<ListResult<JenkinsBinding>> {
    return this.http
      .get(`${JenkinsApiService.PIPELINE_JENKINS_BINDING}/`, { params: query })
      .pipe(map(mapFindBindingResponseToList));
  }

  findBindingsByProject(
    project: string,
    query: { [key: string]: string },
  ): Observable<ListResult<JenkinsBinding>> {
    return this.http
      .get(`${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${project}`, {
        params: query,
      })
      .pipe(map(mapFindBindingResponseToList));
  }

  createBinding(model: BindingParams) {
    return this.http.post(
      `${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${model.namespace}`,
      toCreateBindingResource(model, this.constants),
    );
  }

  updateBinding(model: BindingParams) {
    return this.http.put(
      `${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${model.namespace}/${model.name}`,
      toCreateBindingResource(model, this.constants),
    );
  }

  getBindingResources(
    namespace: string,
    name: string,
  ): Observable<JenkinsResource[]> {
    return this.http
      .get(
        `${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${namespace}/${name}/resources`,
      )
      .pipe(
        map((res: { items: JenkinsResource[]; errors: any[] }) => {
          if (res.errors && res.errors.length) {
            throw res.errors[0];
          } else {
            return res.items;
          }
        }),
      );
  }

  getService(name: string): Observable<ResourceService> {
    return this.http
      .get(`${JenkinsApiService.PIPELINE_JENKINS}/${name}`)
      .pipe(map(mapResourceToJenkinsService));
  }

  createService(data: ToolIntegrateParams) {
    return this.http.post(
      JenkinsApiService.PIPELINE_JENKINS,
      mapIntegrateConfigToJenkinsPayload(data),
    );
  }

  updateService(data: ToolIntegrateParams) {
    return this.http.put(
      `${JenkinsApiService.PIPELINE_JENKINS}/${data.name}`,
      mapIntegrateConfigToJenkinsPayload(data),
    );
  }

  deleteService(name: string) {
    return this.http.delete(`${JenkinsApiService.PIPELINE_JENKINS}/${name}`);
  }

  getBinding(namespace: string, name: string) {
    return this.http
      .get(`${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${namespace}/${name}`)
      .pipe(
        map((item: K8SResource) =>
          mapResourceToJenkinsBinding(item, this.constants),
        ),
      );
  }

  deleteBinding(namespace: string, name: string) {
    return this.http.delete(
      `${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${namespace}/${name}`,
    );
  }

  getJenkinsAgentLabels(
    project: string,
    name: string,
    labelMatcher: string = '',
  ): Observable<JenkinsAgentLabel> {
    return this.http.get(
      `${JenkinsApiService.PIPELINE_JENKINS_BINDING}/${project}/${name}/labels`,
      { params: { labelMatcher } },
    );
  }
}
