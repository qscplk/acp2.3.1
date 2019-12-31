// all api related service

import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Project,
  ProjectsResponse,
  ProjectResponse,
} from './project-api.types';
import { toModel, toResource } from './utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';

@Injectable()
export class ProjectApiService {
  constructor(
    private http: HttpClient,
    @Inject(TOKEN_CONSTANTS) private constants: Constants,
  ) {}

  find(params: {
    [name: string]: string;
  }): Observable<{ items: Project[]; length: number; errors: any[] }> {
    return this.http
      .get<ProjectsResponse>('{{API_GATEWAY}}/auth/v1/projects', {
        params,
      })
      .pipe(
        map(res => ({
          items: res.items.map(item => toModel(item, this.constants)),
          length: res.items.length,
          errors: res.errors,
        })),
      );
  }

  get(name: string): Observable<Project> {
    return this.http
      .get<ProjectResponse>(
        `{{API_GATEWAY}}/apis/auth.alauda.io/v1/projects/${name}`,
      )
      .pipe(map(item => toModel(item, this.constants)));
  }

  delete(name: string) {
    return this.http.delete(
      `{{API_GATEWAY}}/apis/auth.alauda.io/v1/projects/${name}`,
    );
  }

  create(model: Project) {
    return this.http.post(
      `{{API_GATEWAY}}/apis/auth.alauda.io/v1/projects/`,
      toResource(model, this.constants),
    );
  }

  update(project: string, model: Project) {
    return this.http.put(
      `{{API_GATEWAY}}/apis/auth.alauda.io/v1/projects/${project}`,
      toResource(model, this.constants),
    );
  }
}
