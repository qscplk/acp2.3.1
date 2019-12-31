import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import {
  ApplicationIdentity,
  ApplicationsFindParams,
  ApplicationsResponse,
  ComponentModel,
  DetailParams,
  K8sResourceDetail,
  Pod,
  ResourceIdentity,
} from '@app/api/application/application-api.types';
import {
  generateDetailUrl,
  toApplicaitonListItem,
  toByImageResource,
  toContainer,
  toDeployment,
  toHistoryRevisionList,
  toHorizontalPodAutoscaler,
  toList,
  toModel,
} from '@app/api/application/utils';
import { Pagination } from '@app/types';
import { pipe } from '@app/utils/pipe';
import { filterBy, getQuery, pageBy } from '@app/utils/query-builder';
import { safeDump, safeLoad } from 'js-yaml';
import { first, get, last } from 'lodash-es';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class ApplicationApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}
  findApplications({
    name,
    pageIndex,
    itemsPerPage,
    cluster,
    namespace,
  }: ApplicationsFindParams): Observable<Pagination<any>> {
    return this.http
      .get<ApplicationsResponse>(
        `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}`,
        {
          params: {
            cluster,
            sortBy: 'a,name',
            ...getQuery(
              filterBy('name', name),
              pageBy(pageIndex, itemsPerPage),
            ),
          },
        },
      )
      .pipe(
        map(res =>
          Object.assign({
            total: res.listMeta.totalItems,
            items: res.applications.map(toApplicaitonListItem),
          }),
        ),
      );
  }

  createApplication(cluster: string, namespace: string, body: any) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}`,
      toByImageResource(body),
      { params: { cluster } },
    );
  }

  putApplication(
    cluster: string,
    namespace: string,
    body: any,
    appName: string,
  ) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}/${appName}`,
      toByImageResource(body),
      {
        params: { cluster },
      },
    );
  }

  createApplicationWithYaml(cluster: string, namespace: string, body: any) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}`,
      body,
      {
        params: { cluster },
      },
    );
  }

  getCreateApplicationYaml(params: ApplicationIdentity, body: any) {
    const { cluster, namespace } = params;
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}`,
      toByImageResource(body),
      {
        params: {
          cluster,
          isDryRun: 'true',
        },
      },
    );
  }

  getApplications(
    cluster: string,
    namespace: string,
  ): Observable<Pagination<any>> {
    return this.http
      .get<ApplicationsResponse>(
        `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}`,
        {
          params: { cluster },
        },
      )
      .pipe(
        map(res => ({
          total: res.listMeta.totalItems,
          items: res.applications.map(item => toModel(item, this.constants)),
        })),
      );
  }

  find(namespace: string) {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/applications/${namespace}`)
      .pipe(
        map(response => {
          const items = get(response, 'applications');
          return {
            total: get(response, 'listMeta.totalItems'),
            items: items.map(toList),
          };
        }),
      );
  }

  get({ name, namespace, cluster = '' }: ApplicationIdentity): Observable<any> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/applications/${namespace}/${name}`, {
        params: { cluster },
      })
      .pipe(
        map((res: any) => {
          return {
            data: toModel(res, this.constants),
            error: null,
          };
        }),
        catchError((error: any) => {
          return of({
            data: null,
            error,
          });
        }),
      );
  }

  delete(
    { name, namespace, cluster }: ApplicationIdentity,
    body: any,
  ): Observable<any> {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}/${name}/actions/delete`,
      body,
      { params: { cluster } },
    );
  }

  getYaml({ name, namespace, cluster }: ApplicationIdentity): Observable<any> {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}/${name}/yaml`,
        {
          params: { cluster },
        },
      )
      .pipe(
        map((res: any) => res.resources),
        map((resources: any) => (resources ? safeDump(resources) : '')),
      );
  }

  getJsonYaml({
    name,
    namespace,
    cluster,
  }: ApplicationIdentity): Observable<any> {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}/${name}/yaml`,
        {
          params: { cluster },
        },
      )
      .pipe(map((res: any) => res.resources));
  }

  putYaml(
    { name, namespace, cluster }: ApplicationIdentity,
    yaml: string,
  ): Observable<any> {
    return of(yaml).pipe(
      map(y => ({ resources: safeLoad(y) })),
      concatMap(data =>
        this.http.put(
          `{{API_GATEWAY}}/devops/api/v1/applications/${namespace}/${name}/yaml`,
          data,
          {
            params: { cluster },
          },
        ),
      ),
    );
  }

  scaleK8sResource(
    name: string,
    namespace: string,
    kind: string,
    replicas = 0,
    cluster = '',
  ) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${name}/replicas`,
      {
        replicas: replicas < 0 ? 0 : replicas,
      },
      {
        params: { cluster },
      },
    );
  }

  toggleK8sResource(
    name: string,
    namespace: string,
    kind: string,
    type: 'start' | 'stop',
    cluster: string,
  ) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${name}/${type}`,
      {},
      { params: { cluster } },
    );
  }

  getPods(
    deployment: string,
    namespace: string,
    kind: string,
  ): Observable<Pod[]> {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/${kind}/${namespace}/${deployment}/pods`,
      )
      .pipe(
        map((res: any) =>
          ((res.pods as any[]) || []).map(pod => pod.objectMeta.name as string),
        ),
        concatMap(pods =>
          forkJoin(
            pods.map(pod => {
              return this.getContainers(namespace, pod).pipe(
                map(containers => ({
                  name: pod,
                  containers,
                })),
              );
            }),
          ),
        ),
      );
  }

  getK8sResource(
    { namespace, resourceName, cluster }: ResourceIdentity,
    kind: string,
  ): Observable<any> {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}`,
        {
          params: { cluster },
        },
      )
      .pipe(
        map((res: K8sResourceDetail) => {
          res.containers = (get(res, 'containers') || []).map(toContainer);
          return {
            data: res,
            error: null,
          };
        }),
      );
  }

  putK8sResource(
    { namespace, resourceName }: ResourceIdentity,
    yaml: any,
    kind: string,
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}`,
      yaml,
    );
  }

  getContainers(namespace: string, pod: string): Observable<string[]> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/pod/${namespace}/${pod}/container`)
      .pipe(map((res: any) => res.containers as string[]));
  }

  patchLabelsAndAnnotations(params: DetailParams, data: any) {
    return this.http.put<any>(`${generateDetailUrl(params)}/yaml`, data, {
      params: { cluster: params.cluster },
    });
  }

  createVolumeMount(
    resourceKind: string,
    cluster: string,
    namespace: string,
    resourceName: string,
    containerName: string,
    body: any,
  ) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/${resourceKind.toLocaleLowerCase()}/${namespace}/${resourceName}/container/${containerName}/volumeMount`,
      body,
      { params: { cluster } },
    );
  }

  getVolumeMount(type: string, cluster: string, namespace: string) {
    return this.http.get(
      `{{API_GATEWAY}}/devops/api/v1/${type.toLocaleLowerCase()}/${namespace}/`,
      { params: { cluster } },
    );
  }

  getVolumeMountKeyOptions(type: string, namespace: string, name: string) {
    return this.http.get(
      `{{API_GATEWAY}}/devops/api/v1/${type.toLocaleLowerCase()}/${namespace}/${name}`,
    );
  }

  putContainer(
    kind: string,
    cluster: string,
    namespace: string,
    resourceName: string,
    containerName: string,
    payload: any,
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}/container/${containerName}`,
      payload,
      { params: { cluster } },
    );
  }

  previewYaml(
    kind: string,
    cluster: string,
    namespace: string,
    resourceName: string,
    containerName: string,
    payload: any,
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}/container/${containerName}`,
      payload,
      {
        params: {
          cluster,
          isDryRun: 'true',
        },
      },
    );
  }

  putImage(
    kind: string,
    namespace: string,
    resourceName: string,
    containerName: string,
    cluster: string,
    payload: any,
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}/container/${containerName}/image`,
      payload,
      {
        params: { cluster },
      },
    );
  }

  putEnvAndEnvFrom(
    kind: string,
    cluster: string,
    namespace: string,
    resourceName: string,
    containerName: string,
    payload: any,
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}/container/${containerName}/env`,
      payload,
      { params: { cluster } },
    );
  }

  putDeployment(
    cluster: string,
    namespace: string,
    deploymentName: string,
    payload: ComponentModel,
  ): Observable<any> {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/deployment/${namespace}/${deploymentName}`,
      toDeployment(payload),
      { params: { cluster } },
    );
  }

  putContainerSize(
    kind: string,
    cluster: string,
    namespace: string,
    resourceName: string,
    containerName: string,
    resources: any,
  ) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind.toLocaleLowerCase()}/${namespace}/${resourceName}/container/${containerName}/resources`,
      resources,
      { params: { cluster } },
    );
  }

  rollback(
    cluster: string,
    namespace: string,
    resourceName: string,
    revision = -1,
  ) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/deployment/${namespace}/${resourceName}/actions/rollback`,
      { revision: revision },
      { params: { cluster } },
    );
  }

  createHPA(cluster: string, namespace: string, payload: any) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/horizontalpodautoscaler/${namespace}`,
      toHorizontalPodAutoscaler(payload),
      { params: { cluster } },
    );
  }

  updateHPA(cluster: string, namespace: string, name: string, payload: any) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/horizontalpodautoscaler/${namespace}/${name}`,
      toHorizontalPodAutoscaler(payload, name),
      { params: { cluster } },
    );
  }

  deleteHPA(cluster: string, namespace: string, name: string) {
    return this.http.delete(
      `{{API_GATEWAY}}/devops/api/v1/horizontalpodautoscaler/${namespace}/${name}`,
      { params: { cluster } },
    );
  }

  getHistoryRevision(cluster: string, namespace: string, resourceName: string) {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/deployment/${namespace}/${resourceName}/oldreplicaset`,
        { params: { cluster } },
      )
      .pipe(
        map((res: any) => ({
          total: res.listMeta.totalItems,
          items: res.replicaSets.map(toHistoryRevisionList),
        })),
      );
  }

  networkAction(name: string, cluster: string, namespace: string, body: any) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/deployment/${namespace}/${name}/network`,
      body,
      { params: { cluster } },
    );
  }
}

export function splitImageAddress(imageAddress: string) {
  const lastBlock = last(imageAddress.split('/'));
  if (lastBlock.includes(':')) {
    return {
      address: imageAddress
        .split(':')
        .slice(0, -1)
        .join(':'),
      tag: lastBlock.split(':')[1],
    };
  } else {
    return { address: imageAddress, tag: '' };
  }
}

export function toReports(results: any[]) {
  return (results || []).map(result => ({
    name: result.name,
    type: result.kind,
    operation: result.action,
    error: result.error,
  }));
}

export function toRepoName(
  tag: string,
  repositoryName: string,
  repositoryAddress: string,
) {
  const getRepoName = tag
    ? pipe(
        (repositoryName: string) => last(repositoryName.split('/')),
        (reponame: string) => reponame.replace(/[._]/g, '-'),
      )
    : pipe(
        (address: string) => address.split('/'),
        last,
        (ip: string) => ip.split(':'),
        first,
        (reponame: string) => reponame.replace(/[._]/g, '-'),
      );
  return getRepoName(tag ? repositoryName : repositoryAddress);
}

export function getProtocol() {
  return ['TCP', 'UDP', 'HTTP', 'HTTPS', 'GRPC', 'HTTP2'];
}
