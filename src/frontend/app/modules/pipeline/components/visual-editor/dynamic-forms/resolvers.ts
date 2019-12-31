import { Injector } from '@angular/core';
import {
  Application,
  ApplicationApiService,
  CodeQualityApiService,
  CodeQualityBinding,
  CodeRepositoryModel,
  PipelineApiService,
  Secret,
  SecretApiService,
  ToolBinding,
} from '@app/api';
import {
  getWorkloadContainerOptions,
  mapToWorkloadOptions,
} from '@app/api/pipeline/utils';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { Pagination } from '@app/types';
import { filterBy, getQuery } from '@app/utils/query-builder';
import { plural } from 'pluralize';
import * as R from 'ramda';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ControlConfig,
  createControlConfig,
  jsonSerializor,
  stringSerializor,
} from '../store';

export const clusterOptions = (injector: Injector, project: string) => () => {
  const pipelineApiService = injector.get(PipelineApiService);

  return pipelineApiService
    .getProjectClusters(project)
    .pipe(map(toDefaultOptions));
};

export const namespaceOptions = (injector: Injector, project: string) => (
  cluster: string,
) => {
  const pipelineApiService = injector.get(PipelineApiService);

  if (!cluster) {
    return of([]);
  }

  return pipelineApiService
    .getClusterNamespaces(project, cluster)
    .pipe(map(toDefaultOptions));
};

export const secretOptions = (injector: Injector, project: string) => () => {
  const secretApi = injector.get(SecretApiService);

  return secretApi.find({}, project).pipe(
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
};

export const jenkinsOptions = (injector: Injector) => (
  namespace: string,
  {
    state,
    args,
  }: {
    state: Dictionary<unknown>;
    args: any;
  },
) => {
  const appService = injector.get(ApplicationApiService);
  const clusterNameKey = R.prop('clusterName', args) || 'clusterName';
  const clusterName = state[clusterNameKey] as string;

  if (!namespace || !clusterName) {
    return of([]);
  }
  return appService.getApplications(clusterName, namespace).pipe(
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
};

export const containerOptions = (injector: Injector) => (
  relatedValue: string,
  {
    state,
    args,
  }: {
    state: Dictionary<unknown>;
    args: any;
  },
) => {
  // relatedValue: 'appName:deployment:deploymentName'
  if (!relatedValue) {
    return of([]);
  }

  const appService = injector.get(ApplicationApiService);
  const clusterNameKey = R.prop('clusterName', args) || 'clusterName';
  const namespaceKey = R.prop('namespace', args) || 'namespace';
  const clusterName = state[clusterNameKey] as string;
  const namespace = state[namespaceKey] as string;
  const appSplit = relatedValue.split(':');
  const appName = R.head(appSplit);
  if (!relatedValue || !appName) {
    return of([]);
  }

  const workloadType = R.prop(1, appSplit) || '';
  const relatedServiceName = R.last(appSplit);

  return appService
    .get({
      cluster: clusterName,
      namespace: namespace,
      name: appName,
    })
    .pipe(
      map((res: any) => {
        const app: Application = res.data;
        const workloadKey = plural(workloadType);
        const workloads = R.prop<any[]>(workloadKey, app) || [];
        return getWorkloadContainerOptions(workloads, relatedServiceName);
      }),
    );
};

export const toolBindingOptions = (injector: Injector, project: string) => (
  _: unknown,
  {
    args,
  }: {
    args: any;
  },
) => {
  const codeQualityApi = injector.get(CodeQualityApiService);
  const artifactRegistryApi = injector.get(ArtifactRegistryApiService);

  if (!args || !args.bindingKind || !args.bindingToolType) {
    return of([]);
  }

  switch (args.bindingKind.toLowerCase()) {
    case 'codequalitytool':
      return codeQualityApi.bindings
        .find(
          getQuery(
            filterBy('labels', `codeQualityToolType:${args.bindingToolType}`),
          ),
          project,
        )
        .pipe(map(mapCodeQualityBindingOptions));
    case 'artifactregistry':
      return artifactRegistryApi
        .getBindingsByProject(project)
        .pipe(map(mapMavenOptions));
    default:
      return of([]);
  }
};

export const branchOptions = (injector: Injector, project: string) => (
  coderepo: string,
  {
    state,
  }: {
    state: Dictionary<unknown>;
  },
) => {
  const pipelineApi = injector.get(PipelineApiService);
  const repository: string = R.path(
    ['PlatformCodeRepository', 'bindingRepository'],
    state,
  );

  if (!coderepo || !repository) {
    return of([]);
  }
  return pipelineApi.getPipeineCodeRepositoryBranchs(repository, project).pipe(
    map(res => {
      const branches =
        R.prop<Array<{ commit?: string; name: string }>>('branches', res) || [];
      return branches.map(branch => ({
        opt_key: branch.name,
        opt_value: branch.name,
      }));
    }),
  );
};

const formatSecret = (secret: { namespace?: string; name: string }) => {
  if (!secret) {
    return '';
  }

  const namespace = secret.namespace ? `${secret.namespace}-` : '';

  return `${namespace}${secret.name}`;
};

const fromCredentialId = (project: string) => (credentialId: string) => {
  if (!credentialId) {
    return null;
  }

  if (credentialId.startsWith(project)) {
    return {
      namespace: project,
      name: credentialId.slice(project.length + 1),
    };
  }

  return {
    namespace: '',
    name: credentialId,
  };
};

const createCodeRepositorySerializor = (project: string) => ({
  serialize: (data: CodeRepositoryModel) => {
    if (!data) {
      return null;
    }

    const { repo, bindingRepository, kind, secret } = data;

    return JSON.stringify({
      url: repo,
      bindingRepositoryName: kind === 'buildin' ? bindingRepository : '',
      credentialId: formatSecret(secret),
      sourceType: kind === 'svn' ? 'SVN' : 'GIT',
      kind: kind === 'buildin' ? 'select' : 'input',
    });
  },
  deserialize: (value: string) => {
    if (!value) {
      return null;
    }
    try {
      const fromCredentialIdWithProject = fromCredentialId(project);

      const {
        url,
        bindingRepositoryName,
        credentialId,
        sourceType,
        kind,
      } = JSON.parse(value);

      return {
        repo: url,
        secret: fromCredentialIdWithProject(credentialId),
        bindingRepository: bindingRepositoryName || '',
        kind:
          kind === 'select' ? 'buildin' : sourceType === 'SVN' ? 'svn' : 'git',
      };
    } catch {
      return null;
    }
  },
});

const mavenArtifactRegistryOptions = (
  injector: Injector,
  project: string,
) => () => {
  return injector
    .get(ArtifactRegistryApiService)
    .getBindingsByProject(project)
    .pipe(map(mapMavenOptions));
};

export const getControlConfigs = (
  injector: Injector,
  project: string,
): Dictionary<ControlConfig<unknown>> => ({
  'alauda.io/clustername': createControlConfig(
    stringSerializor,
    R.equals,
    clusterOptions(injector, project),
  ),
  'alauda.io/namespace': createControlConfig(
    stringSerializor,
    R.equals,
    namespaceOptions(injector, project),
  ),
  'alauda.io/jenkinscredentials': createControlConfig(
    stringSerializor,
    R.equals,
    secretOptions(injector, project),
  ),
  'alauda.io/servicenamemix': createControlConfig(
    stringSerializor,
    R.equals,
    jenkinsOptions(injector),
  ),
  'alauda.io/containername': createControlConfig(
    stringSerializor,
    R.equals,
    containerOptions(injector),
  ),
  'alauda.io/toolbinding': createControlConfig(
    jsonSerializor,
    R.equals,
    toolBindingOptions(injector, project),
  ),
  'alauda.io/codebranch': createControlConfig(
    stringSerializor,
    R.equals,
    branchOptions(injector, project),
  ),
  'alauda.io/coderepositorymix': createControlConfig(
    createCodeRepositorySerializor(project),
    R.equals,
  ),
  'alauda.io/dependArtifactRegistry': createControlConfig(
    jsonSerializor,
    (a: unknown[], b: unknown[]) =>
      !(
        R.differenceWith(R.equals, a, b).length ||
        R.differenceWith(R.equals, b, a).length
      ),
    mavenArtifactRegistryOptions(injector, project),
  ),
});

function toDefaultOptions<T extends { name: string; displayName: string }>(
  res: T[],
) {
  return res.map(item => {
    return {
      ...item,
      opt_key: item.displayName || item.name,
      opt_value: item.name,
    };
  });
}

function mapMavenOptions(items: ToolBinding[]) {
  return items
    .filter(
      item =>
        R.pathOr<string, string>('', ['tool', 'type'], item).toLowerCase() ===
        'maven2',
    )
    .map(item => ({
      opt_key: item.name,
      opt_value: {
        name: item.name,
        namespace: item.namespace,
      },
    }));
}

function mapCodeQualityBindingOptions(res: { items: CodeQualityBinding[] }) {
  return ((res && res.items) || ([] as CodeQualityBinding[])).map(item => ({
    ...item,
    opt_key: item.name,
    opt_value: {
      name: item.name,
      namespace: item.namespace,
    },
  }));
}
