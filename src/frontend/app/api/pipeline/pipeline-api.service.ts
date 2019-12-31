import {
  API_GATEWAY,
  ExportOption,
  K8sUtilService,
  TOKEN_GLOBAL_NAMESPACE,
} from '@alauda/common-snippet';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { ListResult } from '@app/api/api.types';
import {
  PipelineConfig,
  PipelineConfigModel,
  PipelineHistoryStep,
  PipelineParams,
  PipelineStepInputBody,
  PipelineTemplate,
  PipelineTemplateResource,
  PipelineTemplateSync,
  PipelineTemplateSyncConfig,
  PipelineTemplateSyncResponse,
  TemplateCategory,
} from '@app/api/pipeline/pipeline-api.types';
import {
  toCategoryList,
  toClusterPipelineTemplateList,
  toPipelineConfig,
  toPipelineConfigList,
  toPipelineConfigModel,
  toPipelineConfigResource,
  toPipelineHistory,
  toPipelineTemplate,
  toPipelineTemplateList,
  toPipelineTemplateSync,
  toPipelineTemplateSyncSource,
} from '@app/api/pipeline/utils';
import { ProjectApiService } from '@app/api/project/project-api.service';
import { get, head } from 'lodash-es';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class PipelineApiService {
  static readonly PIPELINE_CONFIG_URL = `${API_GATEWAY}/devops/api/v1/pipelineconfig`;
  static readonly PIPELINE_URL = `${API_GATEWAY}/devops/api/v1/pipeline`;
  static readonly PIPELINE_TEMPLATE_SYNC_URL = `${API_GATEWAY}/devops/api/v1/pipelinetemplatesync`;
  static readonly PIPELINE_TEMPLATE_URL = `${API_GATEWAY}/devops/api/v1/pipelinetemplate`;
  static readonly PIPELINE_CLUSTER_TEMPLATE_URL = `${API_GATEWAY}/devops/api/v1/clusterpipelinetemplate`;
  static readonly PIPELINE_CATEGORIES_URL = `${API_GATEWAY}/devops/api/v1/pipelinetemplatecategories`;
  static readonly PIPELINE_CODE_REPO_BRANCH_URL = `${API_GATEWAY}/devops/api/v1/coderepository`;
  static readonly PIPELINE_JENKINS_BINDING = `${API_GATEWAY}/devops/api/v1/jenkinsbinding`;

  constructor(
    private readonly http: HttpClient,
    private readonly projectApi: ProjectApiService,
    private readonly k8sUtil: K8sUtilService,
    @Inject(TOKEN_GLOBAL_NAMESPACE) private readonly globalNamespace: string,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  findPipelineConfigs(
    project: string,
    params: PipelineParams,
  ): Observable<ListResult<PipelineConfig>> {
    return this.http
      .get(`${PipelineApiService.PIPELINE_CONFIG_URL}/${project}`, {
        params: {
          ...params,
        },
      })
      .pipe(map(item => toPipelineConfigList(item, this.constants)));
  }

  getPipelineConfig(project: string, name: string): Observable<PipelineConfig> {
    return this.http
      .get(`${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${name}`)
      .pipe(map(item => toPipelineConfig(item, this.constants)));
  }

  deletePipelineConfig(project: string, name: string) {
    return this.http.delete(
      `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${name}`,
    );
  }

  createPipelineConfig(project: string, data: PipelineConfigModel) {
    return this.http.post(
      `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}`,
      toPipelineConfigResource(data, project, this.constants),
    );
  }

  getPipelineConfigToModel(
    project: string,
    name: string,
  ): Observable<PipelineConfigModel> {
    return this.getPipelineConfig(project, name).pipe(
      map(toPipelineConfigModel),
    );
  }

  updatePipelineConfig({
    project,
    name,
    data,
  }: {
    project: string;
    name: string;
    data: PipelineConfigModel;
  }) {
    return this.http
      .put(
        `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${name}`,
        toPipelineConfigResource(data, project, this.constants),
      )
      .pipe(map(item => toPipelineConfig(item, this.constants)));
  }

  getPipelineHistorySteps(project: string, name: string, stageId?: string) {
    return this.http.get<{ tasks: PipelineHistoryStep[] }>(
      `${PipelineApiService.PIPELINE_URL}/${project}/${name}/tasks`,
      {
        params: {
          stage: stageId,
        },
      },
    );
  }

  triggerPipelineHistoryInput(
    project: string,
    name: string,
    body: PipelineStepInputBody,
  ) {
    return this.http.post(
      `${PipelineApiService.PIPELINE_URL}/${project}/${name}/inputs`,
      body,
    );
  }

  triggerPipeline(project: string, name: string, parameters = {}) {
    return this.http.post(
      `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${name}/trigger`,
      parameters,
    );
  }

  previewPipelineJenkinsfile(
    project: string,
    params: {
      mode: string;
      templateName?: string;
      kind?: string;
      pipelineConfigName?: string;
    },
    data?: { [key: string]: any },
  ) {
    const url =
      params.mode === 'update'
        ? `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${params.pipelineConfigName}/preview`
        : `${
            params.kind === 'pipelinetemplate'
              ? PipelineApiService.PIPELINE_TEMPLATE_URL + '/' + project
              : PipelineApiService.PIPELINE_CLUSTER_TEMPLATE_URL
          }/${params.templateName}/preview`;
    return this.http.post(url, data || {});
  }

  getTemplateExports(
    project: string,
    templateName: string,
    kind = 'pipelinetemplate',
  ) {
    const baseUrl =
      kind === 'pipelinetemplate'
        ? `${PipelineApiService.PIPELINE_TEMPLATE_URL}/${project} }`
        : PipelineApiService.PIPELINE_CLUSTER_TEMPLATE_URL;

    return this.http.get<{ values: ExportOption[] }>(
      `${baseUrl}/${templateName}/exports`,
    );
  }

  getPipelineHistoryLog(
    project: string,
    name: string,
    params: { start?: number } = {
      start: 0,
    },
  ) {
    return this.http.get(
      `${PipelineApiService.PIPELINE_URL}/${project}/${name}/logs`,
      {
        params: {
          start: `${params.start}`,
        },
      },
    );
  }

  getPipelineHistoryStepLog(
    project: string,
    name: string,
    params: { start?: number; stage?: string; step?: string } = {
      start: 0,
      stage: '',
      step: '',
    },
  ) {
    return this.http.get(
      `${PipelineApiService.PIPELINE_URL}/${project}/${name}/logs`,
      {
        params: {
          start: `${params.start}`,
          stage: params.stage,
          step: params.step,
        },
      },
    );
  }

  getPipelineHistories(project: string, params?: any) {
    return this.http
      .get(`${PipelineApiService.PIPELINE_URL}/${project}`, {
        params,
      })
      .pipe(
        map((response: any) => ({
          total: response.listMeta.totalItems,
          histories: response.pipelines.map((item: any) =>
            toPipelineHistory(item, this.constants),
          ),
        })),
      );
  }

  getPipelineHistory(project: string, name: string, params?: any) {
    return this.http
      .get(`${PipelineApiService.PIPELINE_URL}/${project}/${name}`, {
        params,
      })
      .pipe(map(item => toPipelineHistory(item, this.constants)));
  }

  deletePipeline(project: string, name: string, parameters?: any) {
    return this.http.delete(
      `${PipelineApiService.PIPELINE_URL}/${project}/${name}`,
      {
        params: parameters || {},
      },
    );
  }

  abortPipeline(project: string, name: string) {
    return this.http.put(
      `${PipelineApiService.PIPELINE_URL}/${project}/${name}/abort`,
      null,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  retryPipeline(
    project: string,
    name: string,
    branch = '',
  ): Observable<PipelineTemplateSync> {
    // TODO: not sure pass branch with querystring or body, prevent block testing
    return this.http
      .post<PipelineTemplateSyncResponse>(
        branch
          ? `${PipelineApiService.PIPELINE_URL}/${project}/${name}/retry?branch=${branch}`
          : `${PipelineApiService.PIPELINE_URL}/${project}/${name}/retry`,
        branch ? { branch } : null,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      .pipe(map(item => toPipelineHistory(item, this.constants)));
  }

  templateSetting(
    project: string,
    data: PipelineTemplateSyncConfig,
  ): Observable<PipelineTemplateSync> {
    return this.http
      .post<PipelineTemplateSyncResponse>(
        `${PipelineApiService.PIPELINE_TEMPLATE_SYNC_URL}/${project}`,
        toPipelineTemplateSyncSource(data),
      )
      .pipe(map(toPipelineTemplateSync));
  }

  updateTemplateSetting(
    project: string,
    name: string,
    data: PipelineTemplateSyncConfig,
  ): Observable<PipelineTemplateSync> {
    return this.http
      .put<PipelineTemplateSyncResponse>(
        `${PipelineApiService.PIPELINE_TEMPLATE_SYNC_URL}/${project}/${name}`,
        toPipelineTemplateSyncSource(data),
      )
      .pipe(map(toPipelineTemplateSync));
  }

  templateSyncTrigger(
    project: string,
    name: string,
    data: PipelineTemplateSync,
  ) {
    return this.http
      .put(
        `${PipelineApiService.PIPELINE_TEMPLATE_SYNC_URL}/${project}/${name}`,
        data,
      )
      .pipe(map(toPipelineTemplateSync));
  }

  templateSyncDetail(project: string): Observable<PipelineTemplateSync> {
    return this.http
      .get<PipelineTemplateSyncResponse>(
        `${PipelineApiService.PIPELINE_TEMPLATE_SYNC_URL}/${project}`,
      )
      .pipe(
        map((result: any) => head(result.pipelinetemplatesyncs)),
        map(toPipelineTemplateSync),
      );
  }

  templateList(
    project: string,
    query?: { [key: string]: string },
  ): Observable<ListResult<PipelineTemplate>> {
    return this.http
      .get(`${PipelineApiService.PIPELINE_TEMPLATE_URL}/${project}`, {
        params: query,
      })
      .pipe(map(toPipelineTemplateList));
  }

  templateDetail(project: string, name: string): Observable<PipelineTemplate> {
    return this.http
      .get<PipelineTemplateResource>(
        `${PipelineApiService.PIPELINE_TEMPLATE_URL}/${project}/${name}`,
      )
      .pipe(map(toPipelineTemplate));
  }

  clusterTemplateList(query?: any): Observable<ListResult<PipelineTemplate>> {
    return this.http
      .get(`${PipelineApiService.PIPELINE_CLUSTER_TEMPLATE_URL}`, {
        params: query,
      })
      .pipe(map(toClusterPipelineTemplateList));
  }

  clusterTemplateDetail(name: string): Observable<PipelineTemplate> {
    return this.http
      .get<PipelineTemplateResource>(
        `${PipelineApiService.PIPELINE_CLUSTER_TEMPLATE_URL}/${name}`,
      )
      .pipe(map(toPipelineTemplate));
  }

  categories(project: string): Observable<ListResult<TemplateCategory>> {
    return this.http
      .get(`${PipelineApiService.PIPELINE_CATEGORIES_URL}/${project}`)
      .pipe(map(toCategoryList));
  }

  cronCheck(project: string, jenkinsbinding: string, query: any) {
    return this.http.get(
      `${PipelineApiService.PIPELINE_JENKINS_BINDING}/${project}/${jenkinsbinding}/croncheck`,
      {
        params: query,
      },
    );
  }

  scan(project: string, name: string) {
    return this.http.post(
      `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${name}/scan`,
      {},
    );
  }

  scanLogs(
    project: string,
    name: string,
    params: { start?: number } = { start: 0 },
  ) {
    return this.http.get(
      `${PipelineApiService.PIPELINE_CONFIG_URL}/${project}/${name}/logs`,
      { params: { start: `${params.start}` } },
    );
  }

  getPipeineCodeRepositoryBranchs(repository: string, projectName: string) {
    return this.http.get(
      `${PipelineApiService.PIPELINE_CODE_REPO_BRANCH_URL}/${projectName}/${repository}/branches`,
    );
  }

  getProjectClusters(projectName: string) {
    return forkJoin([
      this.projectApi.get(projectName).pipe(
        map(project => project.clusters),
        map(clusters => (clusters || []).map(cluster => cluster.name)),
        catchError(() => of([])),
      ),
      this.http
        .get(
          `${API_GATEWAY}/apis/clusterregistry.k8s.io/v1alpha1/namespaces/${this.globalNamespace}/clusters`,
        )
        .pipe(
          map<any, any[]>(res => res.items || []),
          catchError(() => of([])),
        ),
    ]).pipe(
      map(([clusterNames, allClusters]) => {
        return allClusters
          .filter(cluster =>
            clusterNames.includes(get(cluster, 'metadata.name')),
          )
          .map((item: any) => ({
            name: item.metadata.name,
            displayName: this.k8sUtil.getDisplayName(item),
          }));
      }),
    );
  }

  getClusterNamespaces(projectName: string, clusterName: string) {
    return this.http
      .get(
        `${API_GATEWAY}/auth/v1/projects/${projectName}/clusters/${clusterName}/namespaces`,
      )
      .pipe(
        map((res: any) =>
          (res.items || []).map((item: any) => ({
            name: item.metadata.name,
            displayName: this.k8sUtil.getDisplayName(item),
          })),
        ),
      );
  }
}
