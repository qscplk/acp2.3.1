import {
  AppK8sResource,
  Application,
  ApplicationInfo,
  ClusterAccess,
  ComponentModel,
  Container,
  DetailParams,
  K8sResourceMap,
  OtherResource,
  PublicIPAccess,
  PublicNetworkAccess,
} from '@app/api/application/application-api.types';
import { mapPipelinesResponse } from '@app/api/pipeline/utils';
import { get, pickBy } from 'lodash-es';
import { Constants } from '@app/constants';

export function toApplicaitonListItem(resource: any): any {
  const appInfo: ApplicationInfo = {
    name: resource.objectMeta.name,
    displayName: resource.description || '',
    creationTimestamp: resource.objectMeta.creationTimestamp,
    resourceList: [],
    visitAddresses: {
      external: [],
      internal: [],
    },
    appStatus: {
      failed: 0,
      pending: 0,
      running: 0,
      total: 0,
    },
  };
  K8sResourceMap.forEach(resourceKind => {
    if (resource[resourceKind] && resource[resourceKind].length > 0) {
      resource[resourceKind].forEach((item: any) => {
        item.resourceKind = resourceKind;
        appInfo.resourceList.push(item);
        switch (item.status) {
          case 'Succeeded':
            appInfo.appStatus.running++;
            break;
          case 'Failed':
            appInfo.appStatus.failed++;
            break;
          case 'Pending':
            appInfo.appStatus.pending++;
            break;
        }
        appInfo.appStatus.total++;
        if (item.visitAddresses.external) {
          appInfo.visitAddresses.external = appInfo.visitAddresses.external.concat(
            item.visitAddresses.external,
          );
        }
        if (item.visitAddresses.internal) {
          appInfo.visitAddresses.internal = appInfo.visitAddresses.internal.concat(
            item.visitAddresses.internal,
          );
        }
      });
    }
  });
  return appInfo;
}

export function toModel(resource: any, constants: Constants): Application {
  const meta = resource.objectMeta || resource.metadata || {};

  const modelResourcceList: any = {};
  K8sResourceMap.forEach(resourceKind => {
    modelResourcceList[resourceKind] = (resource[resourceKind] || []).map(
      toAppK8sResource,
    );
  });
  const others = (resource.others || []).map(toOtherResource);

  const appInfo: any = {
    visitAddresses: {
      external: [],
      internal: [],
    },
    appStatus: {
      failed: 0,
      pending: 0,
      running: 0,
      total: 0,
    },
  };

  K8sResourceMap.forEach(resourceKind => {
    if (resource[resourceKind] && resource[resourceKind].length > 0) {
      resource[resourceKind].forEach((item: any) => {
        item.resourceKind = resourceKind;
        switch (item.status) {
          case 'Succeeded':
            appInfo.appStatus.running++;
            break;
          case 'Failed':
            appInfo.appStatus.failed++;
            break;
          case 'Pending':
            appInfo.appStatus.pending++;
            break;
        }
        appInfo.appStatus.total++;
        if (item.visitAddresses.external) {
          appInfo.visitAddresses.external = appInfo.visitAddresses.external.concat(
            item.visitAddresses.external,
          );
        }
        if (item.visitAddresses.internal) {
          appInfo.visitAddresses.internal = appInfo.visitAddresses.internal.concat(
            item.visitAddresses.internal,
          );
        }
      });
    }
  });

  return {
    name: meta.name,
    displayName: resource.description || '',
    namespace: meta.namespace,
    deployments: modelResourcceList.deployments,
    statefulsets: modelResourcceList.statefulsets,
    daemonsets: modelResourcceList.daemonsets,
    pipelines: mapPipelinesResponse(resource.pipelines || [], constants),
    others,
    appStatus: appInfo.appStatus,
    visitAddresses: appInfo.visitAddresses,
  };
}

export function toAppK8sResource(resource: any): AppK8sResource {
  return {
    ...(resource.injectSidecar !== undefined
      ? { injectSidecar: '' + resource.injectSidecar }
      : {}),
    name: resource.objectMeta.name,
    namespace: resource.objectMeta.namespace,
    podInfo: resource.podInfo,
    containers: (get(resource, 'containers') || []).map(toContainer),
    kind: resource.typeMeta.kind,
    annotations: resource.objectMeta.annotations,
    labels: resource.objectMeta.labels,
    secrets: (resource.imagePullSecrets || []).map(
      (secret: { name: string }) => secret.name,
    ),
    clusterAccess: get(resource, 'networkInfo.internalNetworkInfos'),
    publicNetworkAccess: get(resource, 'networkInfo.externalNetworkInfos'),
    publicIPAccess: get(resource, 'networkInfo.externalNodePortInfos'),
    volumeInfos: resource.volumeInfos,
  };
}

export function toContainer(resource: any): Container {
  return {
    name: resource.name,
    image: resource.image,
    env: resource.env || [],
    envFrom: resource.envFrom || [],
    resources: {
      limits: {
        cpu: get(resource, 'resources.limits.cpu', ''),
        memory: get(resource, 'resources.limits.memory', ''),
      },
      requests: {
        cpu: get(resource, 'resources.requests.cpu', ''),
        memory: get(resource, 'resources.requests.memory', ''),
      },
    },
    args: resource.args || [],
    command: resource.command ? resource.command.join(' ') : '',
    volumeMounts: resource.volumeMounts,
  };
}

export function toOtherResource(resource: any): OtherResource {
  return {
    name: resource.metadata.name,
    namespace: resource.metadata.namespace,
    kind: resource.kind,
  };
}

export function toList(resource: any) {
  const meta = resource.objectMeta || resource.metadata || {};
  return {
    name: meta.name,
  };
}

export function generateDetailUrl(params: DetailParams) {
  return (
    '{{API_GATEWAY}}/devops/api/v1/' +
    [
      params.kind.toLocaleLowerCase(),
      params.namespace || '_',
      params.name,
    ].join('/')
  );
}

export function toDeployment(resource: ComponentModel) {
  const volumeInfos = resource.containers.map(
    (container: Container) => container.volumeMounts,
  );
  return {
    objectMeta: {
      name: resource.componentName,
      labels: resource.labels,
    },
    typeMeta: {
      kind: 'deployment',
    },
    replicas: resource.replicas,
    containers: resource.containers.map(container => {
      return {
        name: container.name,
        image: container.image,
        command: container.command ? container.command.split(' ') : [],
        args: (container.args || []).filter((arg: string) => arg),
        env: container.env,
        envFrom: container.envFrom,
        resources: {
          limits: pickBy(container.resources.limits),
          requests: pickBy(container.resources.requests),
        },
      };
    }),
    volumeInfos: volumeInfos,
    networkInfo: {
      externalNetworkInfos: (resource.publicNetworkAccess || [])
        .filter((item: PublicNetworkAccess) => item.domainName)
        .map((item: PublicNetworkAccess) => {
          const domainPrefix = item.domainPrefix
            ? `${item.domainPrefix.split('.')[0]}.`
            : '';
          const domainName = item.domainName.replace(/^\./, '');
          return {
            domainPrefix: item.domainPrefix || '',
            domainName,
            host: `${domainPrefix}${
              domainName.slice(0, 2) === '*.' ? domainName.slice(1) : domainName
            }`,
            path: item.path,
            targetPort: item.targetPort,
          };
        }),
      internalNetworkInfos: (resource.clusterAccess || []).filter(
        (item: ClusterAccess) => item.protocol,
      ),
      externalNodePortInfos: (resource.publicIPAccess || [])
        .filter((item: PublicIPAccess) => item.protocol)
        .map((item: PublicIPAccess) =>
          item.nodePort
            ? {
                protocol: item.protocol,
                sourcePort: item.sourcePort,
                targetPort: item.sourcePort,
                nodePort: item.nodePort,
              }
            : {
                protocol: item.protocol,
                sourcePort: item.sourcePort,
                targetPort: item.sourcePort,
              },
        ),
    },
    imagePullSecrets: resource.secrets.map(secret => {
      return { name: secret };
    }),
  };
}

export function toByImageResource(formModel: {
  componentList: ComponentModel[];
  appName: string;
  displayName: string;
}) {
  const deployments = formModel.componentList.map(model => {
    return {
      ...(model.injectSidecar === undefined
        ? {}
        : { injectSidecar: '' + model.injectSidecar }),
      objectMeta: {
        name: model.componentName,
        labels: model.labels,
      },
      typeMeta: {
        kind: 'application',
      },
      replicas: model.replicas,
      containers: model.containers.map((container: any) => {
        return {
          name: container.name,
          image: container.image,
          command: container.command ? container.command.split(' ') : [],
          args: (container.args || []).filter((arg: string) => arg),
          env: container.env || [],
          envFrom: container.envFrom || [],
          resources: {
            limits: pickBy(container.resources.limits),
            requests: pickBy(container.resources.requests),
          },
        };
      }),
      volumeInfos: model.containers.map(
        (container: Container) => container.volumeMounts,
      ),
      networkInfo: {
        externalNetworkInfos: (model.publicNetworkAccess || [])
          .filter((item: PublicNetworkAccess) => item.domainName)
          .map((item: PublicNetworkAccess) => {
            const domainPrefix = item.domainPrefix
              ? `${item.domainPrefix.split('.')[0]}.`
              : '';
            const domainName = item.domainName.replace(/^\./, '');
            return {
              domainPrefix: item.domainPrefix || '',
              domainName,
              host: `${domainPrefix}${
                domainName.slice(0, 2) === '*.'
                  ? domainName.slice(1)
                  : domainName
              }`,
              path: item.path,
              targetPort: item.targetPort,
            };
          }),
        internalNetworkInfos: (model.clusterAccess || []).filter(
          (item: ClusterAccess) => item.protocol,
        ),
        externalNodePortInfos: (model.publicIPAccess || [])
          .filter((item: PublicIPAccess) => item.protocol)
          .map((item: PublicIPAccess) =>
            item.nodePort
              ? {
                  protocol: item.protocol,
                  sourcePort: item.sourcePort,
                  targetPort: item.sourcePort,
                  nodePort: item.nodePort,
                }
              : {
                  protocol: item.protocol,
                  sourcePort: item.sourcePort,
                  targetPort: item.sourcePort,
                },
          ),
      },
      imagePullSecrets: (model.secrets || []).map(secret => {
        return { name: secret };
      }),
    };
  });

  return {
    objectMeta: {
      name: formModel.appName,
    },
    typeMeta: {
      kind: 'application',
    },
    deployments: deployments,
    description: formModel.displayName,
  };
}

export function toHistoryRevisionList(replicaSet: any) {
  return {
    creationTimestamp: replicaSet.objectMeta.creationTimestamp,
    revision: replicaSet.revision,
    images: replicaSet.containerImages,
  };
}

export function toHorizontalPodAutoscaler(
  payload: {
    namespace: string;
    appName: string;
    deploymentName: string;
    current: number;
    desired: number;
    minReplicas: number;
    maxReplicas: number;
    memTargetAverageUtilization: number;
    cpuTargetAverageUtilization: number;
  },
  name = '',
) {
  const objectMeta = name
    ? { name: name, namespace: payload.namespace }
    : { namespace: payload.namespace };
  const metrics = [];
  if (payload.memTargetAverageUtilization) {
    metrics.push({
      type: 'Resource',
      resource: {
        name: 'memory',
        targetAverageUtilization: payload.memTargetAverageUtilization,
      },
    });
  }
  if (payload.cpuTargetAverageUtilization) {
    metrics.push({
      type: 'Resource',
      resource: {
        name: 'cpu',
        targetAverageUtilization: payload.cpuTargetAverageUtilization,
      },
    });
  }
  return {
    objectMeta: objectMeta,
    typeMeta: {
      kind: 'HorizontalPodAutoscaler',
    },
    scaleTargetRef: {
      kind: 'Deployment',
      name: payload.deploymentName,
      apiVersion: 'extensions/v1beta1',
    },
    appName: payload.appName,
    minReplicas: payload.minReplicas,
    maxReplicas: payload.maxReplicas,
    currentReplicas: payload.current,
    desiredReplicas: payload.desired,
    metrics: metrics,
  };
}

export function isIndependentWorkload(workload: any, labelBaseDomain: string) {
  return !get(workload, ['metadata', 'labels', `app.${labelBaseDomain}/name`]);
}
