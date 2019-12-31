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
import { FormGroup, ValidatorFn } from '@angular/forms';
import { AppConfigMap, AppSecret, EnvVar, ResourceList } from '@app/api';
import { safeDump } from 'js-yaml';
import { BaseResourceFormArrayComponent } from 'ng-resource-form-util';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

import {
  ENV_VAR_SOURCE_TYPE_TO_KIND,
  KIND_TO_ENV_VAR_SOURCE_TYPE,
  SupportedEnvVarSourceKind,
  SupportedEnvVarSourceType,
  getEnvVarSource,
  getEnvVarSourceType,
  isEnvVarSourceMode,
  isEnvVarSourceSupported,
} from '../utils/env-var';

interface EnvRefObj {
  kind: SupportedEnvVarSourceKind; // One of Secret, configMap
  name: string;
}

interface EnvVarFormModel extends EnvVar {
  refObj?: EnvRefObj;
  refObjKey?: string;
}

@Component({
  selector: 'alo-env-form',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvFormComponent
  extends BaseResourceFormArrayComponent<EnvVar, EnvVarFormModel>
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
    return this.fb.array([]);
  }

  getDefaultFormModel() {
    return [{ name: '', value: '' }];
  }

  getOnFormArrayResizeFn() {
    return () => this.createNewControl();
  }

  adaptResourceModel(envVars: EnvVar[]) {
    if (!envVars || envVars.length === 0) {
      envVars = this.getDefaultFormModel();
    }

    // Fill in keyRefObj when applied:
    return envVars.map((envVar: EnvVarFormModel) => {
      if (isEnvVarSourceSupported(envVar)) {
        const envVarSource = getEnvVarSource(envVar);
        envVar = {
          ...envVar,
          refObj: {
            kind:
              ENV_VAR_SOURCE_TYPE_TO_KIND[
                getEnvVarSourceType(envVar.valueFrom)
              ],
            name: envVarSource.name,
          },
          refObjKey: envVarSource.key,
        };
      }

      return envVar;
    });
  }

  adaptFormModel(envVars: EnvVarFormModel[]): EnvVar[] {
    if (envVars) {
      envVars = envVars.filter(
        ({ name, value, valueFrom }) => name || value || valueFrom,
      );
    }

    return envVars.map(envVar => {
      if (envVar.refObj && envVar.refObj.kind) {
        const refKind: SupportedEnvVarSourceType =
          KIND_TO_ENV_VAR_SOURCE_TYPE[envVar.refObj.kind];
        const envVarSource = {
          [refKind]: {
            name: envVar.refObj.name,
            key: envVar.refObjKey,
          },
        };
        envVar = {
          name: envVar.name,
          valueFrom: envVarSource,
        };
      }

      return envVar;
    });
  }

  getYaml(json: any) {
    return safeDump(json).trim();
  }

  getRefObj(obj: AppConfigMap | AppSecret): EnvRefObj {
    return {
      name: obj.objectMeta.name,
      kind: obj.typeMeta.kind as SupportedEnvVarSourceKind,
    };
  }

  envVarViewMode(envVar: EnvVar): 'value' | 'valueFrom' | 'yaml' {
    if (!isEnvVarSourceMode(envVar)) {
      return 'value';
    } else if (isEnvVarSourceSupported(envVar)) {
      return 'valueFrom';
    } else {
      return 'yaml';
    }
  }

  // Overwrite add so that we could have different types of controls
  add(index = this.length, withRef = false) {
    const control = this.createNewControl();
    if (withRef) {
      control.get('valueFrom').reset({});
    }
    this.form.insert(index, control);
    this.cdr.markForCheck();
  }

  refObjTrackByFn = (refObj: EnvRefObj) => {
    return refObj && refObj.kind
      ? this.translate.get(`application.${refObj.kind.toLowerCase()}`) +
          ': ' +
          refObj.name
      : '';
  };

  refObjFilterFn = (filterString: string, option: OptionComponent) => {
    return option.value.name.includes(filterString);
  };

  // FIXME: use member variable instead since this function returns new observable
  // per call.
  // FIXME: should reset selected key to null after reselect a new refobj.
  getRefObjKeys(control: FormGroup): Observable<string[]> {
    const refObjControl = control.get('refObj');
    return refObjControl.valueChanges.pipe(
      startWith(refObjControl.value),
      switchMap(refObj => {
        const objs$ =
          refObj.kind === 'Secret' ? this.secrets$ : this.configMaps$;
        return objs$.pipe(
          map(objs => {
            const selectObj = objs.find(
              obj => obj.objectMeta.name === refObj.name,
            );
            return selectObj ? selectObj.keys : [];
          }),
        );
      }),
      tap(keys => {
        const keyControl = control.get('refObjKey');
        const enableKeyControl = keys && keys.length > 0;
        if (enableKeyControl) {
          keyControl.enable({ emitEvent: false });
        } else {
          keyControl.disable({ emitEvent: false });
        }
      }),
    );
  }

  private getPreviousKeys(index: number) {
    return this.formModel
      .slice(0, index)
      .map(({ name }) => name)
      .filter(name => !!name);
  }

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

  private createNewControl() {
    const missingKeyValidator: ValidatorFn = control => {
      const { name, value, valueFrom } = control.value;
      if (value && !name && !valueFrom) {
        return {
          keyIsMissing: true,
        };
      } else {
        return null;
      }
    };

    const duplicateKeyValidator: ValidatorFn = control => {
      const index = this.form.controls.indexOf(control);
      const previousKeys = this.getPreviousKeys(index);

      const { name } = control.value;

      if (previousKeys.includes(name)) {
        return {
          duplicateKey: name,
        };
      } else {
        return null;
      }
    };

    return this.fb.group(
      {
        name: [],
        value: [],
        valueFrom: [],

        // The followings are view only controls and will be filtered out later
        refObj: [{}],
        refObjKey: [],
      },
      {
        validator: [missingKeyValidator, duplicateKeyValidator],
      },
    );
  }
}
