import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { mapValues } from 'lodash-es';
import { Observable, of } from 'rxjs';

export interface LogPageParams {
  logFilePosition: string;
  referenceTimestamp: string;
  referenceLineNum: number;
  offsetFrom: number;
  offsetTo: number;
}

export interface ContainerLogParams extends LogPageParams {
  namespace: string;
  cluster: string;
  pod: string;
  container: string;
}

export interface LogLine {
  timestamp: string;
  content: string;
}

export interface LogLineReference {
  timestamp: string;
  lineNum: number;
}

export interface LogSelection {
  logFilePosition: string;
  referencePoint: LogLineReference;
  offsetFrom: number;
  offsetTo: number;
}

export interface LogDetails {
  info: {
    podName: string;
    containerName: string;
    initContainerName: string;
    fromDate: string;
    toDate: string;
    truncated: boolean;
  };
  logs: LogLine[];
  selection: LogSelection;
}

export const LOG_END = 'end';
export const LOG_BEGINNING = 'beginning';
export const LOG_OLDEST = 'oldest';
export const LOG_NEWEST = 'newest';
export const LOG_MAX_SIZE = 2e9;
export const LOG_PER_VIEW = 100;

export const LOG_NEWEST_PARAMS: LogPageParams = {
  logFilePosition: LOG_END,
  referenceTimestamp: LOG_NEWEST,
  referenceLineNum: 0,
  offsetFrom: LOG_MAX_SIZE,
  offsetTo: LOG_MAX_SIZE + LOG_PER_VIEW,
};

export const LOG_OLDEST_PARAMS: LogPageParams = {
  logFilePosition: LOG_BEGINNING,
  referenceTimestamp: LOG_OLDEST,
  referenceLineNum: 0,
  offsetFrom: -LOG_MAX_SIZE - LOG_PER_VIEW,
  offsetTo: -LOG_MAX_SIZE,
};

@Injectable()
export class ContainerLogApiService {
  constructor(private http: HttpClient) {}

  get({
    namespace,
    cluster,
    pod,
    container,
    ...pageParams
  }: ContainerLogParams): Observable<LogDetails> {
    if (!namespace || !pod || !container) {
      return of(null);
    }

    const params = mapValues(pageParams, value => value.toString());

    return this.http.get<LogDetails>(
      `{{API_GATEWAY}}/devops/api/v1/log/${namespace}/${pod}/${container}`,
      { params: { cluster, ...params } },
    );
  }

  getFile({
    namespace,
    pod,
    container,
    cluster,
  }: {
    namespace: string;
    pod: string;
    container: string;
    cluster: string;
  }): Observable<Blob> {
    return this.http.get(
      `{{API_GATEWAY}}/devops/api/v1/log/file/${namespace}/${pod}/${container}`,
      {
        responseType: 'blob',
        params: { cluster },
      },
    );
  }
}
