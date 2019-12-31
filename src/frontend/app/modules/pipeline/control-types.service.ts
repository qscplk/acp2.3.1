import { Injectable } from '@angular/core';
import {
  Application,
  ApplicationApiService,
  CodeQualityApiService,
  PipelineApiService,
  Secret,
  SecretApiService,
} from '@app/api';
import {
  getWorkloadContainerOptions,
  mapToWorkloadOptions,
} from '@app/api/pipeline/utils';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { Pagination } from '@app/types';
import { filterBy, getQuery } from '@app/utils/query-builder';
import { ControlMapper, FormState } from 'alauda-ui-dynamic-forms';
import { get, head, last } from 'lodash-es';
import { plural } from 'pluralize';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export const defaultOptionMapper = (
  res: Array<{ name: string; displayName: string }>,
) => {
  return res.map((item: { name: string; displayName: string }) => {
    return {
      ...item,
      opt_key: item.displayName || item.name,
      opt_value: item.name,
    };
  });
};

@Injectable()
export class PipelineControlTypesService {
  private _project: string;

  set project(nps: string) {
    this._project = nps;
  }

  get project() {
    return this._project;
  }

  constructor(
    private readonly secretApi: SecretApiService,
    private readonly pipelineApi: PipelineApiService,
    private readonly appService: ApplicationApiService,
    private readonly codeQualityApi: CodeQualityApiService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
  ) {}

  clusterOptions() {
    return this.pipelineApi
      .getProjectClusters(this.project)
      .pipe(map(defaultOptionMapper));
  }

  namespaceOptions(cluster: string) {
    if (!cluster) {
      return of([]);
    }

    return this.pipelineApi
      .getClusterNamespaces(this.project, cluster)
      .pipe(map(defaultOptionMapper));
  }

  secretOptions(args?: any) {
    const secretType = get(args, 'type', '');
    return this.secretApi
      .find(getQuery(filterBy('secretType', secretType)), this.project)
      .pipe(
        map((res: { items: Secret[]; length: number }) => {
          return (res.items || []).map((item: Secret) => {
            return {
              ...item,
              opt_key: item.name,
              opt_value: `${item.namespace ? item.namespace + '/' : ''}${
                item.name
              }`,
            };
          });
        }),
      );
  }

  jenkinsOptions(namespace: string, state: FormState, args?: any) {
    const clusterNameKey = get(args, 'clusterName', 'clusterName');
    const clusterName = get(state, `controls.${clusterNameKey}.value`, '');
    if (!namespace || !clusterName) {
      return of([]);
    }
    return this.appService.getApplications(clusterName, namespace).pipe(
      map((apps: Pagination<Application>) => {
        return apps.items.reduce((acc: any[], app: Application) => {
          const workloadTypes = ['deployment', 'daemonset', 'statefulset'];
          const workloadsOptions = workloadTypes.reduce(
            (worloadAcc: any[], workloadType: string) => {
              const options = mapToWorkloadOptions(app, workloadType);
              return [...worloadAcc, ...options];
            },
            [],
          );
          return [...acc, ...workloadsOptions];
        }, []);
      }),
    );
  }

  containerOptions(relatedValue: string, state: FormState, args?: any) {
    // relatedValue: 'appName:deployment:deploymentName' or 'appName:daemonset:daemonsetName' or 'appName:statefulset:statefulsetName'
    if (!relatedValue) {
      return of([]);
    }
    const clusterNameKey = get(args, 'clusterName', 'clusterName');
    const namespaceKey = get(args, 'namespace', 'namespace');
    const clusterName = get(state, `controls.${clusterNameKey}.value`, '');
    const namespace = get(state, `controls.${namespaceKey}.value`, '');
    const appSplit = relatedValue.split(':');
    const appName = head(appSplit);
    if (!relatedValue || !appName) {
      return of([]);
    }

    const workloadType = get(appSplit, '[1]');
    const relatedServiceName = last(appSplit);

    return this.appService
      .get({
        cluster: clusterName,
        namespace: namespace,
        name: appName,
      })
      .pipe(
        map((res: any) => {
          const app: Application = res.data;
          const workloadKey = plural(workloadType);
          const workloads = get(app, `${workloadKey}`, []);
          return getWorkloadContainerOptions(workloads, relatedServiceName);
        }),
      );
  }

  toolBindingOptions(args: { bindingKind: string; bindingToolType: string }) {
    if (!args || !args.bindingKind || !args.bindingToolType) {
      return of([]);
    }
    if (args.bindingKind.toLowerCase() === 'codequalitytool') {
      return this.codeQualityApi.bindings
        .find(
          getQuery(
            filterBy('labels', `codeQualityToolType:${args.bindingToolType}`),
          ),
          this.project,
        )
        .pipe(
          map(res => res.items || []),
          map(items =>
            items.map(item => ({
              ...item,
              opt_key: item.name,
              opt_value: item.name,
            })),
          ),
        );
    }

    if (args.bindingKind.toLowerCase() === 'artifactregistry') {
      return this.artifactRegistryApi.getBindingsByProject(this.project).pipe(
        map(items => {
          return items
            .filter(
              r =>
                get(r, 'tool.type', '').toLocaleLowerCase() ===
                args.bindingToolType.toLowerCase(),
            )
            .map(r => ({
              opt_key: r.name,
              opt_value: r.name,
            }));
        }),
      );
    }
  
    // TODO: only support codeQualityTool for now.
    return of([]);
  }

  branchOptions(coderepo: {
    bindingRepository?: string;
    kind?: string;
    repo?: string;
    secret?: { namespace: string; name: string };
  }) {
    const bindingRepository = get(coderepo, 'bindingRepository', '');
    if (coderepo.kind !== 'buildin' || !bindingRepository) {
      return of([]);
    }
    return this.pipelineApi
      .getPipeineCodeRepositoryBranchs(bindingRepository, this.project)
      .pipe(
        map(res => {
          const branches = get(res, 'branches', []);
          return branches.map((branch: { commit?: string; name: string }) => ({
            opt_key: branch.name,
            opt_value: branch.name,
          }));
        }),
      );
  }

  mavenArtifactRegistryOptions() {
    return this.artifactRegistryApi.getBindingsByProject(this.project).pipe(
      map(items => {
        return items
          .filter(r => get(r, 'tool.type', '').toLocaleLowerCase() === 'maven2')
          .map(r => ({
            opt_key: r.name,
            opt_value: {
              name: r.name,
              namespace: r.namespace,
            },
          }));
      }),
    );
  }

  getControlTypes(): ControlMapper {
    return {
      'alauda.io/clustername': {
        optionsResolver: () => this.clusterOptions(),
      },
      'alauda.io/namespace': {
        optionsResolver: (cluster: string) => this.namespaceOptions(cluster),
      },
      'alauda.io/jenkinscredentials': {
        optionsResolver: (_, __, args) => this.secretOptions(args),
      },
      'alauda.io/servicenamemix': {
        optionsResolver: (namespace: string, state: FormState, args) =>
          this.jenkinsOptions(namespace, state, args),
      },
      'alauda.io/containername': {
        optionsResolver: (relatedValue: string, state: FormState, args) =>
          this.containerOptions(relatedValue, state, args),
      },
      'alauda.io/toolbinding': {
        optionsResolver: (_, __, args) => this.toolBindingOptions(args),
      },
      'alauda.io/codebranch': {
        optionsResolver: (relatedValue: any) =>
          this.branchOptions(relatedValue),
      },
      'alauda.io/dependArtifactRegistry': {
        optionsResolver: () => this.mavenArtifactRegistryOptions(),
      },
    };
  }
}
