import {
  AsyncDataLoader,
  K8sPermissionService,
  K8sResourceAction,
  TranslateService,
  publishRef,
} from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArtifactRegistryBinding, SecretType } from '@app/api';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import {
  BindingKind,
  BindingKindMappingK8sBindingSources,
  getToolChainResourceDefinitions,
} from '@app/api/tool-chain/utils';
import { UpdateArtifactRegistryBindingComponent } from '@app/modules/tool-chain/components/update-artifact-registry-binding/update-artifact-registry-binding.component';
import { ForceUnbindComponent } from '@app/shared/components/force-unbind/force-unbind.component';
import { of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: 'artifact-registry-binding-detail-page.component.html',
  styleUrls: ['artifact-registry-binding-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtifactRegistryBindingDetailPageComponent {
  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      namespace: paramMap.get('name'),
      name: paramMap.get('bindingName'),
    })),
    tap(param => {
      this.name = param.name;
      this.namespace = param.namespace;
    }),
    publishRef(),
  );

  name: string;
  namespace: string;
  binding: ArtifactRegistryBinding;

  permission$ = this.identity$.pipe(
    switchMap(({ name, namespace }) => {
      return this.k8sPermissionService.isAllowed({
        namespace,
        name,
        type: getToolChainResourceDefinitions(
          BindingKindMappingK8sBindingSources[BindingKind.ArtifactRegistry],
        ).TOOLCHAIN,
        action: [K8sResourceAction.UPDATE, K8sResourceAction.DELETE],
      });
    }),
    publishRef(),
  );

  dataLoader = new AsyncDataLoader({
    params$: this.identity$,
    fetcher: params => this.fetchBinding(params),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly k8sPermissionService: K8sPermissionService,
    private readonly location: Location,
  ) {}

  back() {
    this.location.back();
  }

  fetchBinding = (identity: { name: string; namespace: string }) => {
    if (!identity.name || !identity.namespace) {
      return of(null);
    }
    return this.artifactRegistryApi
      .getBinding(identity.namespace, identity.name)
      .pipe(
        tap((binding: ArtifactRegistryBinding) => {
          this.binding = binding;
        }),
      );
  };

  getSecretType(type: SecretType) {
    switch (type) {
      case SecretType.BasicAuth:
        return 'secret.basic_auth';
      case SecretType.OAuth2:
        return 'secret.oauth2';
      default:
        return '-';
    }
  }

  update() {
    this.dialog
      .open(UpdateArtifactRegistryBindingComponent, {
        data: this.binding,
        size: DialogSize.Big,
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.dataLoader.reload();
        }
      });
  }

  unbind(data: ArtifactRegistryBinding) {
    this.dialog.open(ForceUnbindComponent, {
      data: {
        binding: data,
        unbind: () =>
          this.artifactRegistryApi.deleteBinding(data.namespace, data.name),
        hint: this.translate.get('project.force_unbind_hint', {
          name: data.name,
        }),
      },
    });
  }
}
