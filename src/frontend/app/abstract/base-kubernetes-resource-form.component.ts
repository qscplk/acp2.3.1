import { HttpClient } from '@angular/common/http';
import { Injector, OnInit } from '@angular/core';
import { KubernetesResource } from '@app/types';
import { BaseResourceFormGroupComponent } from 'ng-resource-form-util';

export abstract class BaseKubernetesResourceFormComponent<
  R extends KubernetesResource
> extends BaseResourceFormGroupComponent<R> implements OnInit {
  http: HttpClient;

  constructor(injector: Injector) {
    super(injector);
    this.http = injector.get(HttpClient);
  }

  // User need to provide this:
  abstract readonly kind: string;

  ngOnInit(): void {
    super.ngOnInit();
  }

  adaptFormModel(resource: R) {
    resource = Object.assign({}, resource, this.getDefaultFormModel());
    // Remove this for ease of mutating.
    if (resource.metadata) {
      delete resource.metadata.resourceVersion;
    }
    return resource;
  }
}
