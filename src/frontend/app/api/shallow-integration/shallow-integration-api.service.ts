import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ShallowService } from '@app/api/shallow-integration/shallow-integration-api.types';
import {
  ShallowKind,
  mapIntegrateConfigToK8SResource,
  mapResourceToShallowService,
} from '@app/api/shallow-integration/utils';
import { ToolIntegrateParams } from '@app/api/tool-chain/tool-chain-api.types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ShallowIntegrationApiService {
  constructor(private http: HttpClient) {}

  createService(params: ToolIntegrateParams, kind: ShallowKind) {
    return this.http.post(
      `{{API_GATEWAY}}/devops/api/v1/${kind}`,
      mapIntegrateConfigToK8SResource(kind, params),
    );
  }

  getService(kind: ShallowKind, name: string): Observable<ShallowService> {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/${kind}/${name}`)
      .pipe(map(mapResourceToShallowService));
  }

  updateService(kind: ShallowKind, params: ToolIntegrateParams) {
    return this.http.put(
      `{{API_GATEWAY}}/devops/api/v1/${kind}/${params.name}`,
      mapIntegrateConfigToK8SResource(kind, params),
    );
  }

  deleteService(kind: ShallowKind, name: string) {
    return this.http.delete(`{{API_GATEWAY}}/devops/api/v1/${kind}/${name}`);
  }

  getServicesByKind(kind: ShallowKind) {
    return this.http.get(`{{API_GATEWAY}}/devops/api/v1/${kind}`);
  }
}
