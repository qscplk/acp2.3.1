import { TranslateService } from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ApplicationApiService,
  Container,
  EnvFromSource,
  EnvVar,
} from '@app/api';
import { safeDump } from 'js-yaml';
import { cloneDeep, get } from 'lodash-es';

import { EnvFromDialogComponent } from '../env-from-dialog/component';
import { EnvDialogComponent } from '../env-var-dialog/component';
import { getEnvFromSource, getEnvFromSourceKind } from '../utils/env-from';
import {
  getEnvVarSource,
  getEnvVarSourceKind,
  isEnvVarSourceMode,
  isEnvVarSourceSupported,
} from '../utils/env-var';

@Component({
  selector: 'alo-pod-env-list',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
})
export class PodEnvListComponent {
  @Input()
  containers: Container[] = [];

  @Input()
  kind: string;

  @Input()
  resourceName: string;

  @Input()
  cluster: string;

  @Input()
  namespace: string;

  @Input()
  noUpdate: boolean;

  @Input()
  allowedUpdate: boolean;

  @Output()
  update = new EventEmitter<any>();

  readonly envListColumnDefs = ['name', 'config_value'];

  constructor(
    private readonly dialog: DialogService,
    private readonly api: ApplicationApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
  ) {}

  isEnvEmpty(container: Container) {
    return container.env && get(container.env[0], 'name');
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

  envVarResource(
    envVar: EnvVar,
  ): { kind: string; name: string; key: string; namespace: string } {
    const source = getEnvVarSource(envVar);

    return {
      kind: `application.${getEnvVarSourceKind(envVar.valueFrom)}`,
      name: source.name,
      namespace: this.namespace,
      key: source.key,
    };
  }

  envFromResource(
    envFrom: EnvFromSource,
  ): { kind: string; name: string; namespace: string } {
    const source = getEnvFromSource(envFrom);

    return {
      kind: `application.${getEnvFromSourceKind(envFrom)}`,
      name: source.name,
      namespace: this.namespace,
    };
  }

  async editEnvFrom(container: Container) {
    const newEnvFrom = await this.dialog
      .open(EnvFromDialogComponent, {
        data: {
          envFrom: cloneDeep(container.envFrom || []),
          namespace: this.namespace,
          cluster: this.cluster,
        },
      })
      .afterClosed()
      .toPromise();

    if (newEnvFrom) {
      const newContainer = cloneDeep(container);
      newContainer.envFrom = newEnvFrom;
      const payload = {
        env: container.env.filter((env: any) => !!env.name),
        envFrom: newEnvFrom,
      };

      this.api
        .putEnvAndEnvFrom(
          this.kind,
          this.cluster,
          this.namespace,
          this.resourceName,
          container.name,
          payload,
        )
        .subscribe(
          () => {
            this.handleUpdateSuccess('env_from');
          },
          error => {
            this.handleUpdateError(error);
          },
        );
    }
  }

  async editEnv(container: Container) {
    const newEnv = await this.dialog
      .open(EnvDialogComponent, {
        data: {
          env: cloneDeep(container.env || []),
          cluster: this.cluster,
          namespace: this.namespace,
        },
        size: DialogSize.Large,
      })
      .afterClosed()
      .toPromise();

    if (newEnv) {
      const newContainer = cloneDeep(container);
      newContainer.env = newEnv;

      const putEnv = newEnv.map((env: any) => {
        return { name: env.name, value: env.value, valueFrom: env.valueFrom };
      });
      const payload = {
        env: putEnv.filter((env: any) => !!env.name),
        envFrom: container.envFrom,
      };
      this.api
        .putEnvAndEnvFrom(
          this.kind,
          this.cluster,
          this.namespace,
          this.resourceName,
          container.name,
          payload,
        )
        .subscribe(
          () => {
            this.handleUpdateSuccess('env');
          },
          error => {
            this.handleUpdateError(error);
          },
        );
    }
  }

  getYaml(json: any) {
    return safeDump(json).trim();
  }

  handleUpdateSuccess(type: string) {
    this.message.success({
      content: `${this.translate.get(type)}${this.translate.get(
        'update_succeeded',
      )}`,
    });
    this.update.emit();
  }

  handleUpdateError(error: any) {
    this.notifaction.error({
      title: `${this.translate.get('configmap')}${this.translate.get(
        'update_failed',
      )}`,
      content: error.error.error || error.error.message,
    });
  }
}
