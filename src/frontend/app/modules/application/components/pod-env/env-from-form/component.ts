import { TranslateService } from '@alauda/common-snippet';
import { OptionComponent } from '@alauda/ui';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { AppConfigMap, AppSecret, EnvFromSource, ResourceList } from '@app/api';
import { BaseResourceFormComponent } from 'ng-resource-form-util';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

import {
  ENV_FROM_SOURCE_TYPE_TO_KIND,
  KIND_TO_SUPPORTED_ENV_FROM_TYPES,
  SupportedEnvFromSourceKind,
  getEnvFromSource,
  getEnvFromSourceType,
} from '../utils/env-from';

interface EnvFromSourceFormModel {
  kind?: SupportedEnvFromSourceKind;
  name?: string;
}

@Component({
  selector: 'alo-env-from-form',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvFromFormComponent
  extends BaseResourceFormComponent<EnvFromSource[], EnvFromSourceFormModel[]>
  implements OnInit {
  @Input()
  set namespace(namespace: string) {
    this.namespaceChanged.next(namespace);
  }

  @Input()
  set cluster(cluster: string) {
    this.clusterChanged.next(cluster);
  }

  configMaps$: Observable<AppConfigMap[]>;
  secrets$: Observable<AppSecret[]>;

  private readonly clusterChanged = new BehaviorSubject<string>(this.cluster);
  private readonly namespaceChanged = new BehaviorSubject<string>(
    this.namespace,
  );

  constructor(
    private readonly httpClient: HttpClient,
    private readonly translate: TranslateService,
    injector: Injector,
  ) {
    super(injector);
  }

  // We will take care merge by ourself in adaptFormModel
  getResourceMergeStrategy() {
    return false;
  }

  ngOnInit() {
    super.ngOnInit();

    this.configMaps$ = combineLatest(
      this.clusterChanged,
      this.namespaceChanged,
    ).pipe(
      switchMap(([cluster, namespace]) =>
        this.getResources$(cluster, namespace, 'configMap'),
      ),
      map((list: any) => list.items),
      publishReplay(1),
      refCount(),
    );

    this.secrets$ = combineLatest(
      this.clusterChanged,
      this.namespaceChanged,
    ).pipe(
      switchMap(([cluster, namespace]) =>
        this.getResources$(cluster, namespace, 'secret'),
      ),
      map((list: any) => list.secrets),
      publishReplay(1),
      refCount(),
    );
  }

  createForm() {
    return new FormControl([]);
  }

  getDefaultFormModel(): EnvFromSourceFormModel[] {
    return [];
  }

  adaptResourceModel(
    envFromSources: EnvFromSource[],
  ): EnvFromSourceFormModel[] {
    if (!envFromSources || envFromSources.length === 0) {
      return this.getDefaultFormModel();
    }

    // Fill in keyRefObj when applied:
    return envFromSources.map((envFrom: EnvFromSource) => {
      const sourceObj = getEnvFromSource(envFrom);
      const kind = ENV_FROM_SOURCE_TYPE_TO_KIND[getEnvFromSourceType(envFrom)];
      return {
        name: sourceObj.name,
        kind,
      };
    });
  }

  adaptFormModel(
    envFromSourceFormModels: EnvFromSourceFormModel[],
  ): EnvFromSource[] {
    return envFromSourceFormModels.map(({ kind, name }) => {
      const refType = KIND_TO_SUPPORTED_ENV_FROM_TYPES[kind];

      return {
        [refType]: {
          name,
        },
      };
    });
  }

  getRefObj(obj: AppConfigMap | AppSecret): EnvFromSourceFormModel {
    return {
      name: obj.objectMeta.name,
      kind: obj.typeMeta.kind as SupportedEnvFromSourceKind,
    };
  }

  refObjTrackByFn = (refObj: EnvFromSourceFormModel) => {
    const application = `application.${refObj.kind.toLowerCase()}`;
    return refObj && refObj.kind
      ? `${this.translate.get(application)}: ${refObj.name}`
      : '';
  };

  refObjFilterFn = (filterString: string, option: OptionComponent) => {
    return option.value.name.includes(filterString);
  };

  private getResources$(
    cluster: string,
    namespace: string,
    resourceName: string,
  ) {
    return this.httpClient
      .get<ResourceList>(
        `{{API_GATEWAY}}/devops/api/v1/${resourceName.toLocaleLowerCase()}/${namespace ||
          ''}`,
        { params: { cluster } },
      )
      .pipe(publishReplay(1), refCount());
  }
}
