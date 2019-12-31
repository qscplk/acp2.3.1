import {
  ImageRepositoryOption,
  ImageSelectorDataContext,
} from '@alauda/common-snippet';
import { Injector } from '@angular/core';
import {
  ConfigSecretApiService,
  PipelineApiService,
  PipelineTemplate,
  SecretApiService,
  SecretType,
} from '@app/api';
import { ListResult } from '@app/api/api.types';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { ImageRepository } from '@app/api/registry/registry-api.types';
import { toModel } from '@app/api/secret/utils';
import { RESOURCE_TYPES, Constants, TOKEN_CONSTANTS } from '@app/constants';
import { ConfigSecretActions } from '@app/modules/config-secret/services/actions';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { PermissionService } from '@app/services';
import { get } from 'lodash-es';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { exhaustMap, map, switchMap, take } from 'rxjs/operators';

interface Params {
  project: string;
  template: PipelineTemplate;
  cluster?: string;
  namespace?: string;
  secretType?: string;
}

export class LocalImageSelectorDataContext implements ImageSelectorDataContext {
  set params(value: Params) {
    this.params$.next(value);
  }

  set crossCluster(value: boolean) {
    this.crossCluster$.next(value);
  }

  private params$ = new BehaviorSubject<Params>({
    project: '',
    template: null,
    cluster: '',
    namespace: '',
  });

  private crossCluster$ = new BehaviorSubject(false);

  private secretApi = this.injector.get(SecretApiService);

  private configSecretApi = this.injector.get(ConfigSecretApiService);

  private registryApi = this.injector.get(RegistryApiService);

  private permissionApi = this.injector.get(PermissionService);

  private pipelineApi = this.injector.get(PipelineApiService);

  private secretActions = this.injector.get(SecretActions);

  private configSecretActions = this.injector.get(ConfigSecretActions);

  private constants = this.injector.get<Constants>(TOKEN_CONSTANTS);

  constructor(private injector: Injector, private disableExports = false) {}

  canCreateSecret() {
    return this.params$.pipe(
      switchMap(({ project, cluster }) =>
        this.permissionApi.canI(
          'post',
          project,
          RESOURCE_TYPES.SECRETS,
          '',
          cluster,
        ),
      ),
    );
  }

  createSecret() {
    return combineLatest(this.params$, this.crossCluster$).pipe(
      exhaustMap(([{ cluster, namespace, project }, crossCluster]) => {
        if (crossCluster) {
          return this.configSecretActions.create(cluster, namespace, [
            SecretType.DockerConfig,
          ]);
        }
        return this.secretActions.create(
          [SecretType.DockerConfig],
          '',
          project,
        );
      }),
      take(1),
    );
  }

  getImageRepositories(mode?: string) {
    return this.params$.pipe(
      switchMap(({ project }) => {
        let registryApiResult$: Observable<ListResult<ImageRepository>>;
        if (mode && mode === 'create') {
          registryApiResult$ = this.registryApi.findRepositoryProjects(
            project,
            null,
          );
        } else {
          registryApiResult$ = this.registryApi.findRepositoriesByProject(
            project,
            null,
          );
        }
        return registryApiResult$.pipe(
          map(data => data.items),
          map(items =>
            items.map(
              ({
                endpoint,
                type,
                secretName,
                secretNamespace,
                tags,
                image,
                name,
              }) => {
                const imageSegments = image.split('/');
                const [imageProject, imageName] =
                  imageSegments.length > 1 ? imageSegments : [image, ''];
                return {
                  name,
                  type,
                  endpoint,
                  image,
                  repositoryPath: `${endpoint}/${image}`,
                  projectPath: `${endpoint}/${imageProject}`,
                  imageName,
                  tags,
                  secret: {
                    name: secretName,
                    namespace: secretNamespace,
                  },
                };
              },
            ),
          ),
        );
      }),
    );
  }

  getSecrets() {
    return combineLatest(this.params$, this.crossCluster$).pipe(
      switchMap(([{ project, cluster, namespace }, crossCluster]) => {
        if (crossCluster) {
          return this.configSecretApi
            .getSecrets({ cluster, namespace })
            .pipe(
              map(data =>
                data.items
                  .map(item => toModel(item, this.constants))
                  .filter(item => item.type === SecretType.DockerConfig),
              ),
            );
        }
        return this.secretApi
          .find(null, project)
          .pipe(
            map(data =>
              (data.items || []).filter(
                item => item.type === SecretType.DockerConfig,
              ),
            ),
          );
      }),
    );
  }

  getAssetsIconPath(name: string) {
    return `icons/tool-chain/list/${(name || 'docker').toLowerCase()}.svg`;
  }

  getExportOptions() {
    if (this.disableExports) {
      return of([]);
    }

    return this.params$.pipe(
      switchMap(({ template, project }) => {
        const templateName = get(
          template,
          ['pipelineTemplateRef', 'name'],
          get(template, 'name'),
        );
        const templateKind = get(
          template,
          ['pipelineTemplateRef', 'kind'],
          get(template, 'kind'),
        );
        return this.pipelineApi
          .getTemplateExports(project, templateName, templateKind)
          .pipe(map(res => res.values || []));
      }),
    );
  }

  getTags(repository: ImageRepositoryOption) {
    return this.params$.pipe(
      switchMap(({ project }) =>
        this.registryApi
          .findRepositoryTags(project, repository.name, null)
          .pipe(map(list => list.items || [])),
      ),
    );
  }
}
