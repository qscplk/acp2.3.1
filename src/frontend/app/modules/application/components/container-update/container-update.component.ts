import { TranslateService } from '@alauda/common-snippet';
import { DialogService, DialogSize, NotificationService } from '@alauda/ui';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApplicationApiService,
  ContainerParams,
  ResourceIdentity,
  VolumeInfo,
} from '@app/api';
import { safeDump } from 'js-yaml';
import { cloneDeep, get } from 'lodash-es';

import { ResourceYamlPreviewDialogComponent } from '../yaml-preview/yaml-preview-dialog.component';

import { ContainerUpdateDifferDialogComponent } from './container-update-differ-dialog.component';
import { ContainerUpdateFormComponent } from './container-update-form.component';

@Component({
  selector: 'alo-container-update',
  templateUrl: './container-update.component.html',
  styleUrls: [
    './container-update.component.scss',
    '../../shared-style/mutate-page-bottom-buttons.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'alo-container-update',
})
export class ContainerUpdateComponent implements OnInit {
  @Input()
  params: ResourceIdentity;

  resource: any;
  resourceYaml: string;
  resourceName: string;
  containerMap = <any>{};
  containerNames: string[] = [];
  containerName: string;
  containerEditMap = <any>{};
  selectedContainer: any;
  selectedVolume: VolumeInfo[];
  isMulti: boolean;
  kind = '';
  containerParams: ContainerParams;
  @ViewChild('updateForm', { static: false })
  updateForm: ContainerUpdateFormComponent;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly api: ApplicationApiService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly dialog: DialogService,
    private readonly location: Location,
  ) {}

  ngOnInit(): void {
    this.kind = this.route.snapshot.queryParamMap.get('kind');
    this.containerName = this.route.snapshot.queryParamMap.get('name');

    this.api.getK8sResource(this.params, this.kind).subscribe(
      result => {
        this.resource = result.data.data;
        this.resourceYaml = safeDump(this.resource);
        this.resourceName = this._getResourceName(this.resource);
        this.selectedVolume =
          result.data.volumeInfos.find(
            (_: any, index: number) =>
              result.data.containers[index].name === this.containerName,
          ) || [];
        this.containerParams = {
          name: this.params.resourceName,
          kind: this.kind,
          cluster: this.params.cluster,
          namespace: this.params.namespace,
          podInfo: result.data.podInfo,
        };
        const deploymentContainers = this._getDeploymentContainers(
          this.resource,
        );
        this.containerMap = this._getContainerMap(deploymentContainers);
        this.containerNames = Object.keys(this.containerMap);
        this.selectContainer(this.containerName);
        this.cdr.detectChanges();
      },
      () => {
        this.notifaction.error({
          content: this.translate.get('application.deployment_get_fail'),
        });
      },
    );
  }

  selectContainer(name: string) {
    if (!this._validateForm()) {
      return;
    }
    this.selectedContainer = this.containerEditMap[name] =
      this.containerEditMap[name] || cloneDeep(this.containerMap[name]);
    delete this.selectedContainer.__original;
    this.cdr.detectChanges();
  }

  async previewYaml() {
    try {
      const currentYaml = await this._getChangedYaml();
      this.dialog.open(ResourceYamlPreviewDialogComponent, {
        size: DialogSize.Large,
        data: {
          originalYaml: this.resourceYaml,
          currentYaml: currentYaml,
        },
      });
    } catch (error) {
      this.notifaction.error({
        content: error.error.error || error.error.message,
      });
    }
  }

  cancel() {
    if (this.updateForm && this.updateForm.changed()) {
      this.dialog
        .confirm({
          title: this.translate.get('application.cancel_update_confirm', {
            name: this.resourceName,
          }),
          confirmText: this.translate.get('confirm'),
          cancelText: this.translate.get('cancel'),
          content: this.translate.get('application.cancel_update_confirm_tip'),
        })
        .then(() => {
          this.location.back();
        })
        .catch(() => {});
    } else {
      this.location.back();
    }
  }

  showDifferDialog() {
    const dialogRef = this.dialog.open(ContainerUpdateDifferDialogComponent, {
      data: {
        resourceName: this.resourceName,
        params: this.params,
        kind: this.kind,
        container: this.selectedContainer,
        volumeInfo: this.selectedVolume,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['../', this.kind, this.resourceName], {
          relativeTo: this.route,
        });
      }
    });
  }

  save() {
    if (!this._validateForm()) {
      return;
    }
    this.showDifferDialog();
  }

  private _getResourceName(deployment: any) {
    return deployment.metadata.name;
  }

  private _getDeploymentContainers(deployment: any) {
    return get(deployment, 'spec.template.spec.containers') || [];
  }

  private _getContainerMap(containers: any[]) {
    return containers.reduce(
      (prev, container) => ({
        ...prev,
        [container.name]: this._containerToModel(container),
      }),
      {},
    );
  }

  private _containerToModel(container: any) {
    return {
      name: container.name,
      image: container.image,
      env: container.env || [],
      envFrom: container.envFrom || [],
      resources: container.resources || {},
      args: container.args || [],
      command: container.command ? container.command.join(' ') : '',
      __original: container,
    };
  }

  private _getChangedYaml() {
    return this.api
      .previewYaml(
        this.kind,
        this.params.cluster,
        this.params.namespace,
        this.params.resourceName,
        this.selectedContainer.name,
        {
          container: {
            image: this.selectedContainer.image,
            resources: this.selectedContainer.resources,
            env: this.selectedContainer.env,
            envFrom: this.selectedContainer.envFrom,
          },
          VolumeInfo: this.selectedVolume,
        },
      )
      .toPromise();
  }

  private _validateForm() {
    if (this.updateForm && !this.updateForm.vilidate()) {
      this.notifaction.warning({
        title: this.translate.get('application.form_filled_incorrect'),
        content: this.translate.get('application.please_correct_form_content'),
      });
      return false;
    }
    return true;
  }
}
