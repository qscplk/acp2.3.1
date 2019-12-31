import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { ListResult } from '@app/api/api.types';
import {
  ArtifactRegistryBinding,
  ArtifactRegistryManagerService,
  ArtifactRegistryParams,
  ArtifactRegistryService,
  ToolBinding,
  ToolIntegrateParams,
  ToolService,
} from '@app/api/tool-chain/tool-chain-api.types';
import {
  BindingKind,
  ToolKind,
  mapResourceToToolBinding,
  mapToToolService,
} from '@app/api/tool-chain/utils';
import { API_GROUP_VERSION, Constants, TOKEN_CONSTANTS } from '@app/constants';
import { get } from 'lodash-es';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { SecretType } from '../secret/secret-api.types';

const ARTIFACT_REGISTRY_URL = '{{API_GATEWAY}}/devops/api/v1';

const apiSuffixMap: Dictionary<string> = {
  artifactregistrymanager: 'artifactregistrymanagers',
  artifactregistry: 'artifactregistries',
  artifactregistrybinding: 'artifactregistrybindings',
};

const api = (
  _: TemplateStringsArray,
  kind: ToolKind,
  ...segments: string[]
) => {
  return `${ARTIFACT_REGISTRY_URL}/${apiSuffixMap[kind]}/${segments.join('/')}`;
};
// Subresource
const subapi = (
  _: TemplateStringsArray,
  kind: ToolKind,
  ...segments: string[]
) => {
  return `${ARTIFACT_REGISTRY_URL}/common/${apiSuffixMap[kind]}/${segments.join(
    '/',
  )}`;
};

const bindingapi = (
  _: TemplateStringsArray,
  kind: BindingKind,
  ...segments: string[]
) => {
  return `${ARTIFACT_REGISTRY_URL}/${apiSuffixMap[kind]}${
    segments.length ? '/' : ''
  }${segments.join('/')}`;
};

@Injectable()
export class ArtifactRegistryApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  findArtifactRegistryManagers(): Observable<
    ListResult<ArtifactRegistryManagerService>
  > {
    return this.http.get(api`${ToolKind.ArtifactRegistryManager}`).pipe(
      map((res: any) => ({
        total: res.listMeta.totalItems,
        items: (res.artifactregistrymanagers || []).map((item: any) =>
          this.mapToArtifactRegistryManagerService(item),
        ),
        errors: res.errors,
      })),
    );
  }

  findAllRegistries(): Observable<ListResult<ArtifactRegistryService>> {
    return this.http.get(api`${ToolKind.ArtifactRegistry}`).pipe(
      map((res: any) => ({
        total: res.listMeta.totalItems,
        items: (res.artifactregistries || []).map((item: any) =>
          this.mapToArtifactRegistryService(item),
        ),
        errors: res.errors,
      })),
    );
  }

  findRegistiresByManager(
    managerName: string,
  ): Observable<ListResult<ArtifactRegistryService>> {
    return this.http
      .get(
        subapi`${
          ToolKind.ArtifactRegistryManager
        }${managerName}${'sub'}${'artifactregistry'}`,
        {
          params: {
            ArtifactType: 'maven2',
          },
        },
      )
      .pipe(
        map((res: any) => ({
          total: get(res, 'listMeta.totalItems'),
          items: (res.items || []).map((item: any) =>
            this.mapToArtifactRegistryService(item),
          ),
          errors: res.errors,
        })),
      );
  }

  findExistedRegistries(managerName: string) {
    return this.http
      .get(
        subapi`${
          ToolKind.ArtifactRegistryManager
        }${managerName}${'sub'}${'repository'}`,
        {
          params: {
            ArtifactType: 'maven2',
            IsFilterAR: 'true',
          },
        },
      )
      .pipe(
        tap(this.errorHandler),
        map((res: any) => (res.items || []).map(this.mapToRegistryOptions)),
      );
  }

  getFileLocations(managerName: string) {
    return this.http
      .get(
        subapi`${
          ToolKind.ArtifactRegistryManager
        }${managerName}${'sub'}${'blobstore'}`,
      )
      .pipe(
        tap(this.errorHandler),
        map((res: any) => (res.items || []).map(this.mapToFileLocation)),
      );
  }

  createService(params: ToolIntegrateParams, kind: ToolKind) {
    return this.http.post(
      api`${kind}`,
      this.mapToArtifactManagerPayload(params, this.constants),
    );
  }

  updateService(kind: ToolKind, params: ToolIntegrateParams) {
    return this.http.put(
      api`${kind}${params.name}`,
      this.mapToArtifactManagerPayload(params, this.constants),
    );
  }

  createRegistryService(
    managerName: string,
    project = '',
    model: ArtifactRegistryParams,
  ) {
    return this.http
      .post(
        subapi`${
          ToolKind.ArtifactRegistryManager
        }${managerName}${'sub'}${'project'}`,
        this.mapToSubRegistryPayload(model, project),
      )
      .pipe(tap(this.errorHandler));
  }

  updateRegistryService(params: ToolIntegrateParams & ArtifactRegistryParams) {
    return this.http
      .put(
        api`${ToolKind.ArtifactRegistry}${params.name}`,
        this.mapToUpdateRegistryPayload(params),
      )
      .pipe(tap(this.errorHandler));
  }

  getServiceDetail(kind: ToolKind, name: string): Observable<ToolService> {
    return this.http
      .get(api`${kind}${name}`)
      .pipe(
        map(
          kind === ToolKind.ArtifactRegistryManager
            ? item => this.mapToArtifactRegistryManagerService(item)
            : item => this.mapToArtifactRegistryService(item),
        ),
      );
  }

  deleteService(kind: ToolKind, name: string) {
    return this.http.delete(api`${kind}${name}`);
  }

  createBinding(params: Dictionary<string>) {
    return this.http.post(
      bindingapi`${BindingKind.ArtifactRegistry}`,
      this.mapToBindingPayload(params, this.constants),
    );
  }

  findBindings(query: {
    [key: string]: string;
  }): Observable<ListResult<ToolBinding>> {
    return this.http
      .get(bindingapi`${BindingKind.ArtifactRegistry}`, { params: query })
      .pipe(
        map((res: any) => ({
          total: get(res, 'listMeta.totalItems'),
          items: (res.artifactregistrybindings || []).map((item: any) =>
            mapResourceToToolBinding(item, this.constants),
          ),
          errors: res.errors,
        })),
      );
  }

  updateBinding(params: Dictionary<string>) {
    return this.http.put(
      bindingapi`${BindingKind.ArtifactRegistry}${params.namespace}${params.name}`,
      this.mapToBindingPayload(params, this.constants),
    );
  }

  getBinding(namespace: string, name: string) {
    return this.http
      .get(bindingapi`${BindingKind.ArtifactRegistry}${namespace}${name}`)
      .pipe(map(res => this.mapToArtifactRegistryBinding(res, this.constants)));
  }

  deleteBinding(namespace: string, name: string) {
    return this.http.delete(
      bindingapi`${BindingKind.ArtifactRegistry}${namespace}${name}`,
    );
  }

  getBindingsByProject(namespace: string): Observable<ToolBinding[]> {
    return this.http
      .get(bindingapi`${BindingKind.ArtifactRegistry}${namespace}`)
      .pipe(
        map((res: any) =>
          (res.artifactregistrybindings || []).map((item: any) =>
            mapResourceToToolBinding(item, this.constants),
          ),
        ),
      );
  }

  private errorHandler(res: any) {
    if (res.status === 'Failure') {
      throw new HttpErrorResponse({
        status: res.code,
        error: res.message,
      });
    }
  }

  private mapToRegistryOptions(res: any) {
    return {
      name: get(res, 'spec.artifactRegistryName'),
      __original: res,
    };
  }

  private mapToArtifactRegistryBinding(
    res: any,
    constants: Constants,
  ): ArtifactRegistryBinding {
    return {
      name: res.metadata.name,
      creationTimestamp: res.metadata.creationTimestamp,
      namespace: res.metadata.namespace,
      description: res.metadata.annotations[constants.ANNOTATION_DESCRIPTION],
      artifactRegistryName: res.spec.artifactRegistry.name,
      secretName: get(res, 'spec.secret.name'),
      secretNamespace: get(res, 'spec.secret.namespace', ''),
      status: res.status,
      secretType: get(res, [
        'metadata',
        'annotations',
        `${constants.ANNOTATION_PREFIX}/secretType`,
      ]),
      __original: res,
    };
  }

  private mapToArtifactRegistryManagerService(
    managerResource: any,
  ): ArtifactRegistryManagerService {
    return {
      ...mapToToolService(managerResource, this.constants),
      registries: [],
    };
  }

  private mapToBindingPayload(
    params: Dictionary<string>,
    constants: Constants,
  ) {
    return {
      apiVersion: API_GROUP_VERSION,
      kind: 'ArtifactRegistryBinding',
      metadata: {
        name: params.name,
        annotations: {
          [constants.ANNOTATION_DESCRIPTION]: params.description,
          // [ANNOTATION_PRODUCT]: PRODUCT_NAME, // Temp remove
          [`${constants.ANNOTATION_PREFIX}/secretType`]: params.secretType,
        },
        namespace: params.namespace,
      },
      spec: {
        artifactRegistry: {
          name: params.artifactRegistryName,
        },
        secret: {
          name: params.secretName,
          namespace: params.secretNamespace,
        },
      },
    };
  }

  private mapToArtifactRegistryService(
    registryResource: any,
  ): ArtifactRegistryService {
    const metadata = registryResource.metadata || registryResource.objectMeta;
    return {
      ...mapToToolService(registryResource, this.constants),
      versionPolicy: get(
        registryResource,
        'spec.artifactRegistryArgs.versionPolicy',
      ),
      blobStore: get(registryResource, 'spec.artifactRegistryArgs.blobStore'),
      artifactType: get(
        registryResource,
        'spec.artifactRegistryArgs.artifactType',
      ),
      artifactRegistryManager: get(metadata, [
        'labels',
        `${this.constants.ANNOTATION_PREFIX}/artifactRegistryManager`,
      ]),
    };
  }

  private mapToFileLocation(file: any) {
    return {
      name: file.Name,
      __original: file,
    };
  }

  private mapToArtifactManagerPayload(
    params: ToolIntegrateParams,
    constants: Constants,
  ) {
    return {
      metadata: {
        name: params.name,
        annotations: {
          [`${constants.ANNOTATION_PREFIX}/secretType`]: params.secretType,
          [`${constants.ANNOTATION_PREFIX}/toolType`]: 'artifactRegistryManager',
        },
      },
      spec: {
        http: {
          host: params.host,
          accessUrl: params.accessUrl,
        },
        secret: {
          name: params.secretName,
          namespace: params.secretNamespace,
        },
        type: params.type,
      },
    };
  }

  private mapToSubRegistryPayload(
    model: ArtifactRegistryParams,
    project: string,
  ) {
    return {
      metadata: {
        annotations: {
          [`${this.constants.ANNOTATION_PREFIX}/secretType`]:
            model.secretType || SecretType.BasicAuth,
          [`${this.constants.ANNOTATION_PREFIX}/toolType`]: 'artifactRegistry',
          [`${this.constants.ANNOTATION_PREFIX}/toolItemProject`]: project,
        },
      },
      apiVersion: API_GROUP_VERSION,
      kind: 'CreateProjectOptions',
      secretname: model.secretName || '',
      namespace: model.secretNamespace || '',
      name: model.integrateName || '',
      isRemote: 'false',
      data: {
        artifactRegistryName: model.name || model.selectName || '',
        artifactType:
          model.artifactType === 'Maven' ? 'Maven2' : model.artifactType,
        type: 'hosted',
        versionPolicy: model.versionPolicy || '',
        blobStore: model.fileLocation || '',
      },
    };
  }

  private mapToUpdateRegistryPayload(
    params: ToolIntegrateParams & ArtifactRegistryParams,
  ) {
    return {
      metadata: {
        name: params.name,
        annotations: {
          [`${this.constants.ANNOTATION_PREFIX}/secretType`]: params.secretType,
          [`${this.constants.ANNOTATION_PREFIX}/toolType`]: 'artifactRegistry',
        },
      },
      spec: {
        http: {
          host: params.host,
          accessUrl: params.accessUrl,
        },
        secret: {
          name: params.secretName,
          namespace: params.secretNamespace,
        },
        type: params.type,
        artifactRegistryArgs: {
          artifactRegistryName: params.name,
          artifactType: params.artifactType,
          blobStore: params.fileLocation,
          type: 'host',
          versionPolicy: params.versionPolicy,
        },
        artifactRegistryName: params.name,
      },
    };
  }
}
