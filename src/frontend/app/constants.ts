import { createResourceDefinitions } from '@alauda/common-snippet';
import { InjectionToken } from '@angular/core';

export const API_GROUP = 'devops.alauda.io';
export const CRD_API_GROUP = 'crd.alauda.io';
export const API_VERSION = 'v1alpha1';
export const API_GROUP_VERSION = `${API_GROUP}/${API_VERSION}`;
export const ANNOTATION_TEMPLATE_STYLE_ICON = `style.icon`;
export const AUTH_API_GROUP = 'auth.alauda.io';
export const AUTH_API_VERSION = 'v1alpha1';
export const AUTH_API_GROUP_VERSION = `${AUTH_API_GROUP}/${AUTH_API_VERSION}`;

export const PIPELINE_KIND = 'pipeline.kind';
export const createConstantsWithBaseDomain = (baseDomain: string) => ({
  ANNOTATION_PREFIX: baseDomain,
  ANNOTATION_DESCRIPTION: `${baseDomain}/description`,
  ANNOTATION_DISPLAY_NAME: `${baseDomain}/displayName`,
  ANNOTATION_DISPLAY_NAME_2: `${baseDomain}/display-name`, // todo: temp hack
  ANNOTATION_PRODUCT: `${baseDomain}/product`,
  ANNOTATION_PIPELINE_BADGES: `${baseDomain}/jenkins-badges`,
  ANNOTATION_TOOL_ACCESS_URL: `${baseDomain}/toolAccessUrl`,
  ANNOTATION_TOOL_ITEM_TYPE: `${baseDomain}/toolItemType`,
});

export const TOKEN_CONSTANTS = new InjectionToken('global constants');

export type Constants = ReturnType<typeof createConstantsWithBaseDomain>;

const _ = createResourceDefinitions({
  PROJECTS: {
    apiGroup: AUTH_API_GROUP,
    apiVersion: 'v1',
    type: 'projects',
  },
  VIEWS: {
    apiGroup: AUTH_API_GROUP,
    apiVersion: 'v1',
    type: 'views',
  },
  CLUSTERS: {
    apiGroup: 'clusterregistry.k8s.io',
    apiVersion: 'v1alpha1',
    type: 'clusters',
  },
  TAPPS: {
    apiGroup: 'tke.cloud.tencent.com',
    apiVersion: 'v1',
    type: 'tapps',
  },
  DEPLOYMENT: {
    apiGroup: 'apps',
    type: 'deployments',
  },
  DAEMONSET: {
    apiGroup: 'apps',
    type: 'daemonsets',
  },
  STATEFULSET: {
    apiGroup: 'apps',
    type: 'statefulsets',
  },
  SELF_SUBJECT_ACCESS_REVIEWS: {
    apiGroup: 'authorization.k8s.io',
    apiVersion: 'v1',
    type: 'selfsubjectaccessreviews',
  },
  FEATURES: {
    apiGroup: 'infrastructure.alauda.io',
    apiVersion: 'v1alpha1',
    type: 'features',
  },
  HORIZONTAL_POD_AUTO_SCALERS: {
    apiGroup: 'autoscaling',
    apiVersion: 'v1',
    type: 'horizontalpodautoscalers',
  },
  DOMAINS: {
    apiGroup: CRD_API_GROUP,
    apiVersion: 'v2',
    type: 'domains',
  },
  ALAUDA_LOAD_BALANCER_2: {
    apiGroup: CRD_API_GROUP,
    apiVersion: 'v1',
    type: 'alaudaloadbalancer2',
  },
  FRONTENDS: {
    apiGroup: CRD_API_GROUP,
    apiVersion: 'v1',
    type: 'frontends',
  },
  RULES: {
    apiGroup: CRD_API_GROUP,
    apiVersion: 'v1',
    type: 'rules',
  },
  APPLICATIONS: {
    apiGroup: 'app.k8s.io',
    apiVersion: 'v1beta1',
    type: 'applications',
  },
  NAMESPACES: {
    type: 'namespaces',
  },
  RELEASE: {
    type: 'releases',
    apiGroup: 'catalog.alauda.io',
    apiVersion: 'v1alpha1',
  },
  DOMAIN_BINDING: {
    type: 'domainbindings',
    apiGroup: 'catalog.alauda.io',
    apiVersion: 'v1alpha1',
  },
  ROLE_BINDING: {
    type: 'rolebindings',
    apiGroup: 'rbac.authorization.k8s.io',
    apiVersion: 'v1',
  },
  PIPELINETEMPLATESYNCS: {
    type: 'pipelinetemplatesyncs',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  PIPELINECONFIGS: {
    type: 'pipelineconfigs',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  PIPELINECONFIGS_LOGS: {
    type: 'pipelineconfigs/logs',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  PIPELINECONGIFS_SCAN: {
    type: 'pipelineconfigs/scan',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  PIPELINES_LOGS: {
    type: 'pipelines/logs',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  PIPELINES: {
    type: 'pipelines',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  PIPELINES_INPUT: {
    type: 'pipelines/input',
    apiGroup: API_GROUP,
    apiVersion: 'v1alpha1',
  },
  SECRETS: {
    type: 'secrets',
  },
  CONFIGMAPS: {
    type: 'configmaps',
  },
  PERSISTENTVOLUMECLAIMS: {
    type: 'persistentvolumeclaims',
    apiVersion: 'v1',
  },
  IMAGEREPOSITORIES_SECURITY: {
    type: 'imagerepositories/security',
    apiGroup: API_GROUP,
  },
});

export const RESOURCE_DEFINETIONS = _.RESOURCE_DEFINITIONS;
export const RESOURCE_TYPES = _.RESOURCE_TYPES;
export type ResourceType = keyof typeof RESOURCE_TYPES;
