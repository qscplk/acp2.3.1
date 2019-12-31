import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import debug from 'debug';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  PipelineGlobalStatus,
  PipelineGlobalStatusParams,
  PipelineStageStatus,
  PipelineTestReport,
  TestReportParams,
} from './reports-api.types';

const log = debug('dashboard:api');

@Injectable()
export class ReportsApiService {
  constructor(private readonly http: HttpClient) {}

  getPipelineGlobalStatus(
    params: PipelineGlobalStatusParams,
  ): Observable<PipelineGlobalStatus> {
    return this.http.get<PipelineGlobalStatus>(
      `{{API_GATEWAY}}/devops/api/v1/statistics/pipeline/${params.project}`,
      {
        params: {
          filterBy: params.app ? `label,app:${params.app}` : '',
          period: params.range,
        },
      },
    );
  }

  getPipelineStageStatus(
    params: PipelineGlobalStatusParams,
  ): Observable<PipelineStageStatus> {
    return this.http.get<PipelineStageStatus>(
      `{{API_GATEWAY}}/devops/api/v1/statistics/stage/${params.project}`,
      {
        params: {
          filterBy: params.app ? `label,app:${params.app}` : '',
          period: params.range,
        },
      },
    );
  }

  getCodeQualityStatus(namespace: string) {
    return this.http
      .get(`{{API_GATEWAY}}/devops/api/v1/statistics/codequality/${namespace}`)
      .pipe(tap(log));
  }

  getPipelineTestReport(
    params: TestReportParams,
  ): Observable<PipelineTestReport> {
    return this.http
      .get(
        `{{API_GATEWAY}}/devops/api/v1/pipeline/${params.project}/${params.name}/testreports`,
        {
          params: {
            start: params.start,
            limit: params.limit,
          },
        },
      )
      .pipe(
        map((data: PipelineTestReport) =>
          Object.keys(data).reduce(
            (
              c: PipelineTestReport,
              k: 'REGRESSION' | 'FIXED' | 'SKIPPED' | 'PASSED' | 'FAILED',
            ) => {
              c[k.toUpperCase()] = data[k];
              return c;
            },
            {},
          ),
        ),
        tap(log),
      );
  }
}
